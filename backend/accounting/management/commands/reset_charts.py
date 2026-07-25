"""Replace EVERY business's chart of accounts with the current default chart.

Run once after updating the default chart:

    python manage.py reset_charts

What it does per business (tenant schema):
  1. deletes the old ledger (journal entries) and expenses (they reference the
     old accounts and would block deletion),
  2. deletes all old accounts,
  3. re-seeds the new default chart,
  4. re-posts existing sale/purchase invoices and payments onto the new chart,
     so the ledger rebuilds automatically.

Use --schema <name> to reset a single business only.
NOTE: expense records are removed (they must be re-entered). Invoices, payments,
products and customers are kept.
"""
from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context, get_tenant_model


class Command(BaseCommand):
    help = "Replace all businesses' chart of accounts with the default chart."

    def add_arguments(self, parser):
        parser.add_argument('--schema', default=None, help='Reset only this schema')

    def handle(self, *args, **opts):
        from accounting.models import Account, JournalEntry, Expense
        from accounting.services import seed_default_accounts
        from invoicing.models import Invoice, Payment

        T = get_tenant_model()
        qs = T.objects.exclude(schema_name='public')
        if opts.get('schema'):
            qs = qs.filter(schema_name=opts['schema'])

        for t in qs:
            with schema_context(t.schema_name):
                Expense.objects.all().delete()          # release PROTECT refs + old ledger
                JournalEntry.objects.all().delete()
                Account.objects.all().delete()
                created = seed_default_accounts()
                # rebuild the ledger from existing documents
                reposted = 0
                for inv in Invoice.objects.all():
                    try: inv.save(); reposted += 1
                    except Exception: pass
                for pmt in Payment.objects.all():
                    try: pmt.save()
                    except Exception: pass
                self.stdout.write(self.style.SUCCESS(
                    f"{t.schema_name}: {created} accounts seeded, {reposted} invoices re-posted"))
        self.stdout.write(self.style.SUCCESS("Done."))
