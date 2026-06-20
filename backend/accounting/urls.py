from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'accounts', views.AccountViewSet, basename='account')
router.register(r'journal', views.JournalEntryViewSet, basename='journal')
router.register(r'expenses', views.ExpenseViewSet, basename='expense')

urlpatterns = [
    path('seed/', views.SeedAccountsView.as_view()),
    path('vouchers/', views.VoucherView.as_view()),
    path('reports/trial-balance/', views.TrialBalanceView.as_view()),
    path('reports/profit-loss/', views.ProfitLossView.as_view()),
    path('reports/balance-sheet/', views.BalanceSheetView.as_view()),
    path('reports/cash-book/', views.CashBookView.as_view()),
    path('reports/tax-summary/', views.TaxSummaryView.as_view()),
    path('reports/aging/', views.AgingView.as_view()),
    path('reports/account-ledger/<str:code>/', views.AccountLedgerView.as_view()),
    path('reports/party-ledger/<int:party_id>/', views.PartyLedgerView.as_view()),
]

urlpatterns += router.urls
