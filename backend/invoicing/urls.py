from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('parties', views.PartyViewSet, basename='party')
router.register('invoices', views.InvoiceViewSet, basename='invoice')
router.register('payments', views.PaymentViewSet, basename='payment')
router.register('quotations', views.QuotationViewSet, basename='quotation')

urlpatterns = router.urls
