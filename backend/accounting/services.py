"""Accounting engine helpers: default chart of accounts + journal posting."""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .models import Account, JournalEntry, JournalLine

# ---- Well-known account codes used by auto-posting (leaf accounts) ----
AR = '10030201'          # Customers Account (under Accounts Receivables)
AP = '20020501'          # Against supplies (under Payable to Suppliers)
CASH = '10030701'        # Currency Notes (under Cash In Hand)
BANK = '10030601'        # Askari Bank A/c (under Cash at Banks)
TAX_PAYABLE = '20020201'  # WHT payable (under WHT Payables)
SALES = '400101'         # Stock sold (under Sale of Goods)
PURCHASES = '50010101'   # Stocks (under Purchases)
DISCOUNT_GIVEN = '50010301'  # Customer Discounts (under Discounts & rebates)

# Full 4-level chart: (code, name, type, parent_code). is_group is derived below.
_CHART = [
    # ---------------- ASSETS ----------------
    ('1000', 'Assets', 'asset', None),
    ('1001', 'Long Term Assets', 'asset', '1000'),
    ('100101', 'Land & Building Owned', 'asset', '1001'),
    ('10010101', 'Head Office Building (Owned)', 'asset', '100101'),
    ('100102', 'Land & Building Leasehold', 'asset', '1001'),
    ('10010201', 'Head Office Building (Leasehold)', 'asset', '100102'),
    ('100103', 'Office Furniture', 'asset', '1001'),
    ('100104', 'Electrical Equipment', 'asset', '1001'),
    ('10010401', 'Air Conditioner', 'asset', '100104'),
    ('100105', 'Office Equipment', 'asset', '1001'),
    ('10010501', 'Photocopier Machine', 'asset', '100105'),
    ('100106', 'Motor Vehicles', 'asset', '1001'),
    ('10010601', 'Honda Car AV 325', 'asset', '100106'),
    ('100107', 'Computer Equipment', 'asset', '1001'),
    ('10010701', 'Desktop Equipment', 'asset', '100107'),
    ('100108', 'Accumulated Depreciation', 'asset', '1001'),
    ('10010801', 'Depreciation Land and Building', 'asset', '100108'),
    ('10010802', 'Depreciation Furniture and Fixtures', 'asset', '100108'),
    ('10010803', 'Depreciation Air Conditioner Equipment', 'asset', '100108'),
    ('10010804', 'Depreciation Photo Copier Machine', 'asset', '100108'),
    ('10010805', 'Depreciation Honda Car AV 325', 'asset', '100108'),
    ('10010806', 'Depreciation Desktop Equipment', 'asset', '100108'),
    ('10010807', 'Depreciation Plant & Machinery', 'asset', '100108'),
    ('100109', 'Plant & Machinery', 'asset', '1001'),
    ('10010901', 'Factory Machines', 'asset', '100109'),
    ('1002', 'Current Assets', 'asset', '1000'),
    ('100301', 'Inventory/Stock in Trade', 'asset', '1002'),
    ('10030101', 'Stock for local sale', 'asset', '100301'),
    ('100302', 'Accounts Receivables', 'asset', '1002'),
    ('10030201', 'Customers Account', 'asset', '100302'),
    ('100303', 'Advance to Suppliers', 'asset', '1002'),
    ('10030301', 'Deposits against purchases', 'asset', '100303'),
    ('100304', 'Pre-Paid Expenses', 'asset', '1002'),
    ('10030401', 'Advance rent paid', 'asset', '100304'),
    ('100305', 'Security Deposits', 'asset', '1002'),
    ('10030501', 'Cellular Companies', 'asset', '100305'),
    ('100306', 'Cash at Banks', 'asset', '1002'),
    ('10030601', 'Askari Bank A/c', 'asset', '100306'),
    ('100307', 'Cash In Hand', 'asset', '1002'),
    ('10030701', 'Currency Notes', 'asset', '100307'),
    ('100308', 'Other Assets', 'asset', '1002'),
    ('10030801', 'Store & Spares', 'asset', '100308'),
    # ---------------- LIABILITIES ----------------
    ('2000', 'Liabilities', 'liability', None),
    ('2001', 'Long Term Liabilities', 'liability', '2000'),
    ('200101', 'Bank Borrowings', 'liability', '2001'),
    ('20010101', 'Askari Bank', 'liability', '200101'),
    ('2002', 'Current Liabilities', 'liability', '2000'),
    ('200201', 'Accrued Salaries', 'liability', '2002'),
    ('20020101', 'Staff Salary m/o June', 'liability', '200201'),
    ('200202', 'WHT Payables', 'liability', '2002'),
    ('20020201', 'WHT payable on salaries', 'liability', '200202'),
    ('200203', 'Advance from Customers', 'liability', '2002'),
    ('20020301', 'Advance for stock', 'liability', '200203'),
    ('200204', 'Accrued Expenses', 'liability', '2002'),
    ('20020401', 'Rent Payable', 'liability', '200204'),
    ('200205', 'Payable to Suppliers', 'liability', '2002'),
    ('20020501', 'Against supplies', 'liability', '200205'),
    ('200206', 'Utility Bills Payable', 'liability', '2002'),
    ('20020601', 'Electricity Bill', 'liability', '200206'),
    ('200207', 'Other Payables', 'liability', '2002'),
    ('20020701', 'Wages payable', 'liability', '200207'),
    # ---------------- EQUITY ----------------
    ('3000', 'Equity', 'equity', None),
    ('3001', 'Paid Up Capital', 'equity', '3000'),
    ('300101', 'Capital Subscribed', 'equity', '3001'),
    ('3002', 'Retained Earnings', 'equity', '3000'),
    ('300201', 'Profit for the year', 'equity', '3002'),
    ('300202', 'Profit c/f', 'equity', '3002'),
    # ---------------- INCOME ----------------
    ('4000', 'Income', 'income', None),
    ('4001', 'Sale of Goods', 'income', '4000'),
    ('400101', 'Stock sold', 'income', '4001'),
    ('4002', 'Fee & Commissions', 'income', '4000'),
    ('400201', 'Professional Fees', 'income', '4002'),
    ('4003', 'Other Income', 'income', '4000'),
    ('400301', 'Bank profits', 'income', '4003'),
    # ---------------- EXPENSES ----------------
    ('5000', 'Expenses', 'expense', None),
    ('5001', 'Direct Expenses', 'expense', '5000'),
    ('500101', 'Purchases', 'expense', '5001'),
    ('50010101', 'Stocks', 'expense', '500101'),
    ('500102', 'Freight Charges', 'expense', '5001'),
    ('50010201', 'Custom Clearance Fees', 'expense', '500102'),
    ('500103', 'Discounts & rebates', 'expense', '5001'),
    ('50010301', 'Customer Discounts', 'expense', '500103'),
    ('500104', 'Direct Labours Cost', 'expense', '5001'),
    ('50010401', 'Daily Wagers', 'expense', '500104'),
    ('500105', 'Depreciation Plant & Machinery', 'expense', '5001'),
    ('50010501', 'Factory Equipment', 'expense', '500105'),
    ('500106', 'Utility Charges', 'expense', '5001'),
    ('50010601', 'Electricity Bills Plant', 'expense', '500106'),
    ('500107', 'Repair & Maintenance (Plant & Machinery)', 'expense', '5001'),
    ('50010701', 'Factory Machines', 'expense', '500107'),
    ('500108', 'Store & Supplies', 'expense', '5001'),
    ('50010801', 'Store for plants', 'expense', '500108'),
    ('5002', 'Admin & Operational Expenses', 'expense', '5000'),
    ('500201', 'Salary & Wages', 'expense', '5002'),
    ('50020101', 'H/o Staff', 'expense', '500201'),
    ('500202', 'Building rent', 'expense', '5002'),
    ('50020201', 'H/o Building', 'expense', '500202'),
    ('500203', 'Utility Charges', 'expense', '5002'),
    ('50020301', 'H/o Utilities', 'expense', '500203'),
    ('500204', 'Repair & Maintenance (Office Equipment)', 'expense', '5002'),
    ('50020401', 'Photocopier machine', 'expense', '500204'),
    ('500205', 'Repair & Maintenance (Vehicles)', 'expense', '5002'),
    ('50020501', 'Honda City', 'expense', '500205'),
    ('500206', 'Printing & Stationery', 'expense', '5002'),
    ('50020601', 'Office Stationery', 'expense', '500206'),
    ('500207', 'Legal & Professional Charges', 'expense', '5002'),
    ('50020701', 'Auditors fee', 'expense', '500207'),
    ('500208', 'Telephone/Internet Charges', 'expense', '5002'),
    ('50020801', 'Transworld', 'expense', '500208'),
    ('500209', 'Travelling Expense', 'expense', '5002'),
    ('50020901', 'Local Travelling', 'expense', '500209'),
    ('500210', 'Fees & Subscriptions', 'expense', '5002'),
    ('50021001', 'Excise Duties', 'expense', '500210'),
    ('500211', 'Advertisement & Marketing Expense', 'expense', '5002'),
    ('50021101', 'Print Media', 'expense', '500211'),
    ('500212', 'Entertainment Expense', 'expense', '5002'),
    ('50021201', 'H/o Entertainment', 'expense', '500212'),
    ('500213', 'Depreciation Expense', 'expense', '5002'),
    ('50021301', 'Depreciation Land and Building', 'expense', '500213'),
    ('50021302', 'Depreciation Furnitures and Fixtures', 'expense', '500213'),
    ('50021303', 'Depreciation Air Conditioner Equipment', 'expense', '500213'),
    ('50021304', 'Depreciation Photocopier Machines', 'expense', '500213'),
    ('50021305', 'Depreciation Honda Car AV 325', 'expense', '500213'),
    ('50021306', 'Depreciation Desktop Equipment', 'expense', '500213'),
    ('500214', 'Miscellaneous Expense', 'expense', '5002'),
    ('50021401', 'Other Expenses', 'expense', '500214'),
]

# Any code that is a parent of another is a group (heading, not postable).
_PARENT_CODES = {p for (_, _, _, p) in _CHART if p}
# code, name, type, is_group, parent_code
DEFAULT_CHART = [(c, n, t, c in _PARENT_CODES, p) for (c, n, t, p) in _CHART]


def _active_template():
    """The saved chart template (from public schema), if any."""
    try:
        from tenants.models import ChartTemplate
        return ChartTemplate.objects.order_by('-id').first()
    except Exception:
        return None


def seed_default_accounts():
    """Seed a business's chart of accounts from the standard chart.
    Parents are created before children (shorter codes first)."""
    created = 0
    for code, name, type_, is_group, parent_code in sorted(DEFAULT_CHART, key=lambda x: (len(str(x[0])), str(x[0]))):
        parent = Account.objects.filter(code=parent_code).first() if parent_code else None
        _, was_created = Account.objects.get_or_create(
            code=code, defaults=dict(name=name, type=type_, is_group=is_group, parent=parent))
        if was_created:
            created += 1
    return created


def acc(code):
    return Account.objects.filter(code=code).first()


# ---- Resolve well-known accounts within the CURRENT business ----
# Prefer the standard code; if that code isn't in this chart (e.g. a custom
# consultant chart), find the right account by name. Keeps auto-posting working
# regardless of the numbering scheme.
_DEFAULT_CODE = {'ar': AR, 'ap': AP, 'cash': CASH, 'bank': BANK,
                 'tax': TAX_PAYABLE, 'sales': SALES, 'purchases': PURCHASES,
                 'discount': DISCOUNT_GIVEN}


def _find(type_, keywords, exclude=()):
    for a in Account.objects.filter(is_group=False, type=type_).order_by('code'):
        n = (a.name or '').lower()
        if any(k in n for k in keywords) and not any(e in n for e in exclude):
            return a
    return None


def code_for(role):
    """Return the account CODE for a posting role in the current business."""
    default = _DEFAULT_CODE.get(role)
    if default and acc(default):
        return default
    finder = {
        'ar': lambda: _find('asset', ('receivable',)),
        'ap': lambda: _find('liability', ('payable',), exclude=('tax',)),
        'cash': lambda: _find('asset', ('cash in hand', 'cash-in-hand')) or _find('asset', ('cash',), exclude=('bank',)),
        'bank': lambda: _find('asset', ('bank',)),
        'tax': lambda: _find('liability', ('tax',)),
        'sales': lambda: _find('income', ('sale',)),
        'purchases': lambda: _find('expense', ('purchase', 'cost of good')),
        'discount': lambda: _find('expense', ('discount',)),
    }.get(role)
    a = finder() if finder else None
    return a.code if a else default


def next_number(prefix):
    n = JournalEntry.objects.filter(number__startswith=prefix).count() + 1
    # ensure uniqueness even if some were deleted
    while JournalEntry.objects.filter(number=f"{prefix}-{n:05d}").exists():
        n += 1
    return f"{prefix}-{n:05d}"


def _d(v):
    return Decimal(str(v or 0))


@transaction.atomic
def post_entry(type_, lines, date=None, narration='', reference='', source_model='', source_id=None):
    """lines: list of dicts {code, debit, credit, party(optional)}.
    Skips zero lines. Returns the JournalEntry, or None if nothing/unbalanced."""
    clean = [l for l in lines if _d(l.get('debit')) or _d(l.get('credit'))]
    if not clean:
        return None
    total_d = sum(_d(l.get('debit')) for l in clean)
    total_c = sum(_d(l.get('credit')) for l in clean)
    if total_d != total_c:
        # never post an unbalanced entry
        raise ValueError(f"Unbalanced entry: Dr {total_d} != Cr {total_c}")

    prefix = {'receipt': 'RV', 'payment': 'PV', 'sales': 'SV', 'purchase': 'PU',
              'expense': 'EV', 'contra': 'CV', 'opening': 'OB'}.get(type_, 'JV')
    entry = JournalEntry.objects.create(
        number=next_number(prefix), date=date or timezone.now().date(), type=type_,
        narration=narration, reference=reference,
        source_model=source_model, source_id=source_id,
    )
    for l in clean:
        account = acc(l['code']) if isinstance(l.get('code'), str) else l.get('account')
        if account is None:
            continue
        JournalLine.objects.create(
            entry=entry, account=account, party=l.get('party'),
            debit=_d(l.get('debit')), credit=_d(l.get('credit')),
            narration=l.get('narration', ''),
        )
    return entry


def cash_or_bank_code(method):
    return code_for('cash') if method == 'cash' else code_for('bank')


def reverse_entry(source_model, source_id):
    """Remove the journal entry posted from a source document (invoice/payment/
    expense). Used so an edit can re-post fresh, or a delete can undo the ledger."""
    if not source_id:
        return 0
    return JournalEntry.objects.filter(source_model=source_model, source_id=source_id).delete()
