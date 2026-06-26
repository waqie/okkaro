from django.apps import AppConfig


class InventoryConfig(AppConfig):
    name = 'inventory'

    def ready(self):
        # connect signals that move stock when invoices are saved/deleted
        from . import stock_sync  # noqa: F401
