# Seed sample data into the demo tenant so screens look full & professional.
import random, datetime
from django_tenants.utils import schema_context
from django.utils import timezone

with schema_context('demo'):
    from invoicing.models import Party, Invoice, InvoiceItem, Payment
    from inventory.models import Product
    from accounting.services import seed_default_accounts, acc, CASH
    from accounting.models import Expense, Account

    seed_default_accounts()

    if Invoice.objects.exists():
        print('>>> Demo data already present — skipping seed')
        raise SystemExit

    # Customers
    parties = []
    for nm in ['Ali Traders', 'Khan Store', 'Bismillah Mart', 'Hassan & Sons', 'City Cash & Carry']:
        p, _ = Party.objects.get_or_create(name=nm, defaults=dict(
            party_type='customer', phone='0300' + str(random.randint(1000000, 9999999)), city='Lahore'))
        parties.append(p)

    # Products
    products = []
    for nm, sp, pp in [('Basmati Rice 5kg', 1500, 1200), ('Cooking Oil 1L', 550, 470),
                       ('Sugar 1kg', 140, 120), ('Tea 500g', 900, 780),
                       ('Flour 10kg', 1300, 1150), ('Soap Bar', 90, 70)]:
        pr, _ = Product.objects.get_or_create(name=nm, defaults=dict(
            sale_price=sp, purchase_price=pp, current_stock=random.randint(20, 100), unit='pcs'))
        products.append(pr)

    today = timezone.now().date()
    made = 0
    for m in range(5, -1, -1):
        for _ in range(random.randint(3, 6)):
            d = today.replace(day=min(15, today.day)) - datetime.timedelta(days=m * 30)
            party = random.choice(parties)
            last = Invoice.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            inv = Invoice.objects.create(invoice_number=f"SI-{num:05d}", invoice_type='sale',
                                         party=party, date=d, status='unpaid')
            for _ in range(random.randint(1, 3)):
                pr = random.choice(products)
                InvoiceItem.objects.create(invoice=inv, product_name=pr.name,
                                           quantity=random.randint(1, 5), unit='pcs', unit_price=pr.sale_price)
            inv.calculate_totals(); inv.save()
            if random.random() < 0.6:
                amt = inv.grand_total if random.random() < 0.6 else inv.grand_total / 2
                Payment.objects.create(party=party, invoice=inv, amount=amt,
                                       method=random.choice(['cash', 'bank', 'jazzcash']), date=d)
                inv.paid_amount = amt; inv.calculate_totals(); inv.save()
            made += 1

    # Expenses
    exp_accounts = list(Account.objects.filter(type='expense', is_group=False))
    cash = acc(CASH)
    if exp_accounts and cash:
        for m in range(5, -1, -1):
            for _ in range(random.randint(1, 3)):
                d = today.replace(day=min(10, today.day)) - datetime.timedelta(days=m * 30)
                Expense.objects.create(date=d, account=random.choice(exp_accounts),
                                       paid_from=cash, amount=random.randint(2000, 15000), payee='Misc')

    print(f">>> Demo data ready: {made} invoices, {len(parties)} customers, {len(products)} products + expenses")
print(">>> Done")
