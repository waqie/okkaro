# Seed the default Chart of Accounts into the demo tenant.
from django_tenants.utils import schema_context
from accounting.services import seed_default_accounts

with schema_context('demo'):
    n = seed_default_accounts()
    print(f">>> {n} accounts seed kiye (Chart of Accounts tayar)")
print(">>> Done")
