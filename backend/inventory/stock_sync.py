"""Keep product stock in sync with sale/purchase invoices.

A sale invoice reduces stock; a purchase invoice increases it. Only items
linked to a real inventory Product of type 'good' move stock (services and
free-text manual items are ignored). Posting is idempotent: on every invoice
save we REVERSE the previous stock movements for that invoice and re-apply from
current items — so edits stay correct. On delete we reverse them.

Stock can go negative (oversell is allowed by design — the UI warns the user).
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

log = logging.getLogger(__name__)


def _reverse(ref):
    from .models import StockMovement
    for m in StockMovement.objects.filter(reference=ref).select_related('product'):
        p = m.product
        if not p:
            continue
        if m.movement_type == 'out':
            p.current_stock = (p.current_stock or 0) + m.quantity
        elif m.movement_type == 'in':
            p.current_stock = (p.current_stock or 0) - m.quantity
        p.save(update_fields=['current_stock'])
    StockMovement.objects.filter(reference=ref).delete()


def sync_invoice_stock(invoice):
    from .models import StockMovement
    ref = f"INV:{invoice.id}"
    _reverse(ref)
    if getattr(invoice, 'status', '') == 'cancelled':
        return
    mtype = 'out' if invoice.invoice_type == 'sale' else 'in'
    for it in invoice.items.select_related('product').all():
        p = it.product
        if not p or p.product_type != 'good':
            continue
        StockMovement.objects.create(
            product=p, movement_type=mtype, quantity=it.quantity,
            reference=ref, notes=invoice.invoice_number)


@receiver(post_save, sender='invoicing.Invoice')
def _on_invoice_save(sender, instance, **kwargs):
    try:
        sync_invoice_stock(instance)
    except Exception as e:  # pragma: no cover — never break the invoice save
        log.error("stock sync (save) failed: %s", e)


@receiver(post_delete, sender='invoicing.Invoice')
def _on_invoice_delete(sender, instance, **kwargs):
    try:
        _reverse(f"INV:{instance.id}")
    except Exception as e:  # pragma: no cover
        log.error("stock sync (delete) failed: %s", e)
