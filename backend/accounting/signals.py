"""Auto-post source documents (invoices, payments, expenses) into the ledger.

Posting is idempotent: on every save we REVERSE the previous journal entry for
that document and post a fresh one from current values — so EDITS stay correct.
On delete we reverse the entry so the ledger is undone.
All handlers are defensive: a posting failure must never break the source save.
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import JournalEntry, Expense
from . import services as svc

log = logging.getLogger(__name__)


@receiver(post_save, sender='invoicing.Invoice')
def post_invoice(sender, instance, **kwargs):
    try:
        inv = instance
        # reverse any prior posting so edits re-post cleanly
        svc.reverse_entry('invoice', inv.id)
        if not inv.grand_total or float(inv.grand_total) <= 0:
            return
        if not svc.acc(svc.SALES):   # chart not seeded yet
            return

        if inv.invoice_type == 'sale':
            lines = [
                {'code': svc.AR, 'debit': inv.grand_total, 'party': inv.party},
                {'code': svc.DISCOUNT_GIVEN, 'debit': inv.discount_amount},
                {'code': svc.SALES, 'credit': inv.subtotal},
                {'code': svc.TAX_PAYABLE, 'credit': inv.tax_amount},
            ]
            svc.post_entry('sales', lines, date=inv.date,
                           narration=f"Sale invoice {inv.invoice_number}",
                           reference=inv.invoice_number,
                           source_model='invoice', source_id=inv.id)
        else:  # purchase
            lines = [
                {'code': svc.PURCHASES, 'debit': (inv.subtotal - inv.discount_amount)},
                {'code': svc.TAX_PAYABLE, 'debit': inv.tax_amount},
                {'code': svc.AP, 'credit': inv.grand_total, 'party': inv.party},
            ]
            svc.post_entry('purchase', lines, date=inv.date,
                           narration=f"Purchase invoice {inv.invoice_number}",
                           reference=inv.invoice_number,
                           source_model='invoice', source_id=inv.id)
    except Exception as e:  # pragma: no cover
        log.error("Failed to post invoice to ledger: %s", e)


def _recompute_invoice(invoice_id):
    """Keep an invoice's paid_amount / balance / status in sync with its payments."""
    if not invoice_id:
        return
    try:
        from django.db.models import Sum
        from invoicing.models import Invoice, Payment
        inv = Invoice.objects.filter(id=invoice_id).first()
        if not inv:
            return
        paid = Payment.objects.filter(invoice_id=invoice_id).aggregate(s=Sum('amount'))['s'] or 0
        inv.paid_amount = paid
        inv.calculate_totals()
        Invoice.objects.filter(id=inv.id).update(
            paid_amount=inv.paid_amount, balance_due=inv.balance_due, status=inv.status)
    except Exception as e:  # pragma: no cover
        log.error("Failed to recompute invoice from payments: %s", e)


@receiver(post_save, sender='invoicing.Payment')
def post_payment(sender, instance, **kwargs):
    try:
        pmt = instance
        svc.reverse_entry('payment', pmt.id)  # re-post on edit
        if pmt.amount and float(pmt.amount) > 0 and svc.acc(svc.AR):
            # money received from a customer: Dr Cash/Bank, Cr Accounts Receivable
            lines = [
                {'code': svc.cash_or_bank_code(pmt.method), 'debit': pmt.amount},
                {'code': svc.AR, 'credit': pmt.amount, 'party': pmt.party},
            ]
            svc.post_entry('receipt', lines, date=pmt.date,
                           narration=f"Payment received ({pmt.get_method_display()})",
                           reference=pmt.reference,
                           source_model='payment', source_id=pmt.id)
        _recompute_invoice(pmt.invoice_id)
    except Exception as e:  # pragma: no cover
        log.error("Failed to post payment to ledger: %s", e)


@receiver(post_save, sender=Expense)
def post_expense(sender, instance, **kwargs):
    try:
        exp = instance
        svc.reverse_entry('expense', exp.id)  # re-post on edit
        if not exp.amount or float(exp.amount) <= 0:
            return
        if not (exp.account_id and exp.paid_from_id):
            return
        entry = svc.post_entry(
            'expense',
            [
                {'account': exp.account, 'debit': exp.amount},
                {'account': exp.paid_from, 'credit': exp.amount},
            ],
            date=exp.date,
            narration=exp.notes or f"Expense: {exp.account.name}",
            reference=exp.payee,
            source_model='expense', source_id=exp.id,
        )
        if entry:
            Expense.objects.filter(pk=exp.pk).update(journal_entry=entry)
    except Exception as e:  # pragma: no cover
        log.error("Failed to post expense to ledger: %s", e)


# ---- Deletes: undo the ledger ----
@receiver(post_delete, sender='invoicing.Invoice')
def unpost_invoice(sender, instance, **kwargs):
    try:
        svc.reverse_entry('invoice', instance.id)
    except Exception as e:  # pragma: no cover
        log.error("Failed to reverse invoice ledger: %s", e)


@receiver(post_delete, sender='invoicing.Payment')
def unpost_payment(sender, instance, **kwargs):
    try:
        svc.reverse_entry('payment', instance.id)
        _recompute_invoice(instance.invoice_id)
    except Exception as e:  # pragma: no cover
        log.error("Failed to reverse payment ledger: %s", e)


@receiver(post_delete, sender=Expense)
def unpost_expense(sender, instance, **kwargs):
    try:
        svc.reverse_entry('expense', instance.id)
    except Exception as e:  # pragma: no cover
        log.error("Failed to reverse expense ledger: %s", e)
