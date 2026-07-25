"""Accounting engine helpers: default chart of accounts + journal posting."""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .models import Account, JournalEntry, JournalLine

# ---- Well-known account codes used by auto-posting ----
AR = '1100'          # Accounts Receivable (customers owe us)
AP = '2100'          # Accounts Payable (we owe suppliers)
CASH = '1010'        # Cash in Hand
BANK = '1020'        # Bank
TAX_PAYABLE = '2200'  # Sales tax / GST payable
SALES = '4100'       # Sales income
PURCHASES = '5100'   # Purchases / Cost of goods
DISCOUNT_GIVEN = '5050'  # Discount allowed (expense)

# code, name, type, is_group, parent_code
DEFAULT_CHART = [
    ('1000', 'Assets', 'asset', True, None),
    ('1010', 'Cash in Hand', 'asset', False, '1000'),
    ('1020', 'Bank', 'asset', False, '1000'),
    ('1100', 'Accounts Receivable', 'asset', False, '1000'),
    ('1200', 'Inventory', 'asset', False, '1000'),

    ('2000', 'Liabilities', 'liability', True, None),
    ('2100', 'Accounts Payable', 'liability', False, '2000'),
    ('2200', 'Sales Tax Payable', 'liability', False, '2000'),

    ('3000', 'Equity', 'equity', True, None),
    ('3100', 'Capital', 'equity', False, '3000'),
    ('3900', 'Retained Earnings', 'equity', False, '3000'),

    ('4000', 'Income', 'income', True, None),
    ('4100', 'Sales', 'income', False, '4000'),
    ('4900', 'Other Income', 'income', False, '4000'),

    ('5000', 'Expenses', 'expense', True, None),
    ('5050', 'Discount Allowed', 'expense', False, '5000'),
    ('5100', 'Purchases', 'expense', False, '5000'),
    ('5200', 'Rent', 'expense', False, '5000'),
    ('5300', 'Salaries', 'expense', False, '5000'),
    ('5400', 'Utilities (Bijli/Gas/Phone)', 'expense', False, '5000'),
    ('5500', 'Transport', 'expense', False, '5000'),
    ('5600', 'Marketing', 'expense', False, '5000'),
    ('5900', 'Miscellaneous', 'expense', False, '5000'),
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
