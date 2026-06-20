from django.db import models
from django.utils import timezone


class Account(models.Model):
    """A ledger account in the Chart of Accounts."""
    TYPE = [
        ('asset', 'Asset'),
        ('liability', 'Liability'),
        ('equity', 'Equity'),
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]

    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=120)
    type = models.CharField(max_length=20, choices=TYPE)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children')
    is_group = models.BooleanField(default=False)          # heading vs postable account
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def normal_side(self):
        # assets & expenses increase on debit; rest increase on credit
        return 'debit' if self.type in ('asset', 'expense') else 'credit'


class JournalEntry(models.Model):
    """A balanced double-entry voucher (debits == credits)."""
    TYPE = [
        ('opening', 'Opening'),
        ('journal', 'Journal'),
        ('receipt', 'Receipt'),
        ('payment', 'Payment'),
        ('contra', 'Contra'),
        ('sales', 'Sales'),
        ('purchase', 'Purchase'),
        ('expense', 'Expense'),
    ]

    number = models.CharField(max_length=30, unique=True)
    date = models.DateField(default=timezone.now)
    type = models.CharField(max_length=20, choices=TYPE, default='journal')
    narration = models.TextField(blank=True)
    reference = models.CharField(max_length=120, blank=True)
    # optional soft links back to source documents (no hard FK to keep it decoupled)
    source_model = models.CharField(max_length=40, blank=True)
    source_id = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.number} ({self.type})"

    @property
    def total_debit(self):
        return sum((l.debit for l in self.lines.all()), 0)

    @property
    def total_credit(self):
        return sum((l.credit for l in self.lines.all()), 0)


class JournalLine(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='lines')
    party = models.ForeignKey('invoicing.Party', null=True, blank=True,
                              on_delete=models.SET_NULL, related_name='journal_lines')
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    narration = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.account.code} Dr {self.debit} / Cr {self.credit}"


class Expense(models.Model):
    """A business expense. Auto-posts a journal entry (Dr expense, Cr cash/bank)."""
    date = models.DateField(default=timezone.now)
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='expenses',
                                limit_choices_to={'type': 'expense'})
    paid_from = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='expense_payments')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payee = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    journal_entry = models.OneToOneField(JournalEntry, null=True, blank=True,
                                         on_delete=models.SET_NULL, related_name='expense')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.account.name} - {self.amount}"
