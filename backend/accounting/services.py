"""Accounting engine helpers: default chart of accounts + journal posting."""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .models import Account, JournalEntry, JournalLine

# ---- Well-known account codes used by auto-posting (match the default chart) ----
AR = '100302'          # Accounts Receivables
AP = '200205'          # Payable to Suppliers
CASH = '100307'        # Cash In Hand
BANK = '100306'        # Cash at Banks
TAX_PAYABLE = '200202'  # WHT Payables
SALES = '4001'         # Sale of Goods
PURCHASES = '500101'   # Purchases
DISCOUNT_GIVEN = '500103'  # Discounts & rebates

# Standard chart of accounts. code, name, type, is_group, parent_code
DEFAULT_CHART = [
    ('1000', 'Assets', 'asset', True, None),
    ('1001', 'Long Term Assets', 'asset', True, '1000'),
    ('100101', 'Land & Building Owned', 'asset', False, '1001'),
    ('100102', 'Land & Building Leasehold', 'asset', False, '1001'),
    ('100103', 'Furniture & Fixtures', 'asset', False, '1001'),
    ('100104', 'Electrical Equipment', 'asset', False, '1001'),
    ('100105', 'Office Equipment', 'asset', False, '1001'),
    ('100106', 'Motor Vehicles', 'asset', False, '1001'),
    ('100107', 'Computer Equipment', 'asset', False, '1001'),
    ('100108', 'Accumulated Depreciation', 'asset', False, '1001'),
    ('1002', 'Current Assets', 'asset', True, '1000'),
    ('100301', 'Inventory/Stock in Trade', 'asset', False, '1002'),
    ('100302', 'Accounts Receivables', 'asset', False, '1002'),
    ('100303', 'Advance to Suppliers', 'asset', False, '1002'),
    ('100304', 'Pre-Paid Expenses', 'asset', False, '1002'),
    ('100305', 'Security Deposits', 'asset', False, '1002'),
    ('100306', 'Cash at Banks', 'asset', False, '1002'),
    ('100307', 'Cash In Hand', 'asset', False, '1002'),
    ('100308', 'Other Assets', 'asset', False, '1002'),

    ('2000', 'Liabilities', 'liability', True, None),
    ('2001', 'Long Term Liabilities', 'liability', True, '2000'),
    ('200101', 'Bank Borrowings', 'liability', False, '2001'),
    ('2002', 'Current Liabilities', 'liability', True, '2000'),
    ('200201', 'Accrued Salaries', 'liability', False, '2002'),
    ('200202', 'WHT Payables', 'liability', False, '2002'),
    ('200203', 'Advance from Customers', 'liability', False, '2002'),
    ('200204', 'Accrued Expenses', 'liability', False, '2002'),
    ('200205', 'Payable to Suppliers', 'liability', False, '2002'),
    ('200206', 'Utility Bills Payable', 'liability', False, '2002'),
    ('200207', 'Other Payables', 'liability', False, '2002'),

    ('3000', 'Equity', 'equity', True, None),
    ('3001', 'Paid Up Capital', 'equity', False, '3000'),
    ('3002', 'Retained Earnings', 'equity', False, '3000'),

    ('4000', 'Income', 'income', True, None),
    ('4001', 'Sale of Goods', 'income', False, '4000'),
    ('4002', 'Fee & Commissions', 'income', False, '4000'),
    ('4003', 'Other Income', 'income', False, '4000'),

    ('5000', 'Expenses', 'expense', True, None),
    ('5001', 'Direct Expenses', 'expense', True, '5000'),
    ('500101', 'Purchases', 'expense', False, '5001'),
    ('500102', 'Freight Charges', 'expense', False, '5001'),
    ('500103', 'Discounts & rebates', 'expense', False, '5001'),
    ('500104', 'Direct Labours Cost', 'expense', False, '5001'),
    ('500105', 'Depreciation Plant & Machinery', 'expense', False, '5001'),
    ('500106', 'Utility Charges', 'expense', False, '5001'),
    ('500107', 'Repair & Maintenance (Plant & Machinery)', 'expense', False, '5001'),
    ('500108', 'Store & Supplies', 'expense', False, '5001'),
    ('5002', 'Admin & Operational Expenses', 'expense', True, '5000'),
    ('500201', 'Salary & Wages', 'expense', False, '5002'),
    ('500202', 'Building rent', 'expense', False, '5002'),
    ('500203', 'Utility Charges', 'expense', False, '5002'),
    ('500204', 'Repair & Maintenance (Office Equipment)', 'expense', False, '5002'),
    ('500205', 'Repair & Maintenance (Vehicles)', 'expense', False, '5002'),
    ('500206', 'Printing & Stationery', 'expense', False, '5002'),
    ('500207', 'Legal & Professional Charges', 'expense', False, '5002'),
    ('500208', 'Telephone/Internet Charges', 'expense', False, '5002'),
    ('500209', 'Travelling Expense', 'expense', False, '5002'),
    ('500210', 'Fees & Subscriptions', 'expense', False, '5002'),
    ('500211', 'Advertisement & Marketing Expense', 'expense', False, '5002'),
    ('500212', 'Entertainment Expense', 'expense', False, '5002'),
    ('500213', 'Depreciation Expense', 'expense', False, '5002'),
    ('500214', 'Miscellaneous Expense', 'expense', False, '5002'),
    ('5015', 'Store & Spares (Dead Stock)', 'expense', False, '5000'),
]


def _active_template():
    """The saved chart template (from public schema), if any."""
    try:
        from tenants.models import ChartTemplate
        return ChartTemplate.objects.order_by('-id').first()
    except Exception:
        return None


def seed_default_accounts():
    """Seed a business's chart of accounts.

    Uses the saved ChartTemplate (an admin-approved chart from a real business)
    if one exists; otherwise the built-in default. Parents are created before
    children (shorter codes first)."""
    tpl = _active_template()
    if tpl and tpl.accounts:
        rows = [(a['code'], a['name'], a['type'], a.get('is_group', False),
                 a.get('parent_code'), a) for a in tpl.accounts]
    else:
        rows = [(c, n, ty, g, p, None) for (c, n, ty, g, p) in DEFAULT_CHART]

    created = 0
    for code, name, type_, is_group, parent_code, extra in sorted(rows, key=lambda x: (len(str(x[0])), str(x[0]))):
        parent = Account.objects.filter(code=parent_code).first() if parent_code else None
        defaults = dict(name=name, type=type_, is_group=is_group, parent=parent)
        if extra:
            defaults['bank_name'] = extra.get('bank_name', '') or ''
            defaults['account_number'] = extra.get('account_number', '') or ''
            try:
                defaults['opening_balance'] = Decimal(str(extra.get('opening_balance') or 0))
            except Exception:
                pass
        _, was_created = Account.objects.get_or_create(code=code, defaults=defaults)
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
