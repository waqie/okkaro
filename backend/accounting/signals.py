"""Auto-post source documents (invoices, payments, expenses) into the ledger.
All handlers are defensive: a posting failure must never break the source save.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import JournalEntry, Expense
from . import services as svc

log = logging.getLogger(__name__)


def _already_posted(model, pk):
    return JournalEntry.objects.filter(source_model=model, source_id=pk).exists()


@receiver(post_save, sender='invoicing.Invoice')
def post_invoice(sender, instance, **kwargs):
    try:
        inv = instance
        if not inv.grand_total or float(inv.grand_total) <= 0:
            return
        if _already_posted('invoice', inv.id):
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


@receiver(post_save, sender='invoicing.Payment')
def post_payment(sender, instance, created, **kwargs):
    try:
        if not created:
            return
        pmt = instance
        if not pmt.amount or float(pmt.amount) <= 0:
            return
        if _already_posted('payment', pmt.id):
            return
        if not svc.acc(svc.AR):
            return
        # money received from a customer: Dr Cash/Bank, Cr Accounts Receivable
        lines = [
            {'code': svc.cash_or_bank_code(pmt.method), 'debit': pmt.amount},
            {'code': svc.AR, 'credit': pmt.amount, 'party': pmt.party},
        ]
        svc.post_entry('receipt', lines, date=pmt.date,
                       narration=f"Payment received ({pmt.get_method_display()})",
                       reference=pmt.reference,
                       source_model='payment', source_id=pmt.id)
    except Exception as e:  # pragma: no cover
        log.error("Failed to post payment to ledger: %s", e)


@receiver(post_save, sender=Expense)
def post_expense(sender, instance, created, **kwargs):
    try:
        exp = instance
        if exp.journal_entry_id:
            return
        if not exp.amount or float(exp.amount) <= 0:
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
