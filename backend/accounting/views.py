from decimal import Decimal
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone

from .models import Account, JournalEntry, JournalLine, Expense
from .serializers import (AccountSerializer, JournalEntrySerializer,
                          ExpenseSerializer)
from . import services as svc


D0 = Decimal('0')


def _range(request):
    frm = request.query_params.get('from')
    to = request.query_params.get('to')
    return frm, to


def _line_qs(account=None, frm=None, to=None, party=None):
    qs = JournalLine.objects.all()
    if account is not None:
        qs = qs.filter(account=account)
    if party is not None:
        qs = qs.filter(party=party)
    if frm:
        qs = qs.filter(entry__date__gte=frm)
    if to:
        qs = qs.filter(entry__date__lte=to)
    return qs


def _sums(qs):
    a = qs.aggregate(d=Sum('debit'), c=Sum('credit'))
    return (a['d'] or D0), (a['c'] or D0)


def _opening_signed(account):
    ob = account.opening_balance or D0
    return ob if account.normal_side == 'debit' else -ob


# ---------------- CRUD ViewSets ----------------
class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'name']
    pagination_class = None      # the chart of accounts is a tree — always return all

    def get_queryset(self):
        qs = Account.objects.all()
        t = self.request.query_params.get('type')
        if t:
            qs = qs.filter(type=t)
        if self.request.query_params.get('postable') == '1':
            qs = qs.filter(is_group=False)
        return qs

    def destroy(self, request, *args, **kwargs):
        acc = self.get_object()
        if acc.children.exists():
            return Response({'error': 'This account has sub-accounts. Delete those first.'}, status=400)
        force = request.query_params.get('force') == '1'
        if acc.lines.exists() and not force:
            # tell the frontend it needs a force-confirm
            return Response({'error': 'has_transactions'}, status=409)
        if acc.lines.exists():
            # force: remove whole journal entries that touch this account (keeps the
            # remaining ledger balanced), then delete the account
            entry_ids = list(acc.lines.values_list('entry_id', flat=True).distinct())
            JournalEntry.objects.filter(id__in=entry_ids).delete()
        acc.delete()
        return Response(status=204)

    @action(detail=True, methods=['post'])
    def merge(self, request, pk=None):
        """Move this account's transactions into another account, then delete it."""
        src = self.get_object()
        if src.children.exists():
            return Response({'error': 'Move or delete its sub-accounts first.'}, status=400)
        target = Account.objects.filter(id=request.data.get('target')).first()
        if not target or target.id == src.id:
            return Response({'error': 'Pick a valid target account.'}, status=400)
        JournalLine.objects.filter(account=src).update(account=target)
        Expense.objects.filter(account=src).update(account=target)
        Expense.objects.filter(paid_from=src).update(paid_from=target)
        src.delete()
        return Response({'ok': True, 'moved_to': target.id})


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    queryset = JournalEntry.objects.prefetch_related('lines__account', 'lines__party')

    def destroy(self, request, *args, **kwargs):
        e = self.get_object()
        if e.source_model:
            return Response({'error': f'This voucher was auto-created from a {e.source_model}. Edit or delete that {e.source_model} instead.'}, status=400)
        e.delete()
        return Response(status=204)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['payee', 'notes']

    def get_queryset(self):
        return Expense.objects.select_related('account', 'paid_from')


# ---------------- Setup ----------------
class SeedAccountsView(APIView):
    def post(self, request):
        created = svc.seed_default_accounts()
        return Response({'created': created, 'message': 'Chart of accounts ready'})


class VoucherView(APIView):
    """Create a manual double-entry voucher (Journal/Receipt/Payment/Contra)."""
    def post(self, request):
        data = request.data
        built = []
        for l in data.get('lines', []):
            account = Account.objects.filter(id=l.get('account')).first()
            if not account:
                continue
            party = None
            if l.get('party'):
                from invoicing.models import Party
                party = Party.objects.filter(id=l.get('party')).first()
            built.append({'account': account, 'debit': l.get('debit') or 0,
                          'credit': l.get('credit') or 0, 'party': party,
                          'narration': l.get('narration', '')})
        try:
            entry = svc.post_entry(data.get('type', 'journal'), built,
                                   date=data.get('date'), narration=data.get('narration', ''),
                                   reference=data.get('reference', ''))
        except ValueError as e:
            return Response({'error': str(e)}, status=400)
        if not entry:
            return Response({'error': 'Voucher is empty or unbalanced'}, status=400)
        return Response(JournalEntrySerializer(entry).data, status=201)


# ---------------- Reports ----------------
class TrialBalanceView(APIView):
    def get(self, request):
        frm, to = _range(request)
        rows, td, tc = [], D0, D0
        for a in Account.objects.filter(is_group=False, is_active=True):
            d, c = _sums(_line_qs(a, frm, to))
            net = _opening_signed(a) + (d - c)
            debit = net if net > 0 else D0
            credit = -net if net < 0 else D0
            if debit or credit:
                rows.append({'code': a.code, 'name': a.name, 'type': a.type,
                             'debit': debit, 'credit': credit})
                td += debit
                tc += credit
        return Response({'rows': rows, 'total_debit': td, 'total_credit': tc})


class ProfitLossView(APIView):
    def get(self, request):
        frm, to = _range(request)
        income, expense = [], []
        inc_total, exp_total = D0, D0
        for a in Account.objects.filter(is_group=False, type='income'):
            d, c = _sums(_line_qs(a, frm, to))
            amt = -((_opening_signed(a)) + (d - c))  # credit positive
            if amt:
                income.append({'name': a.name, 'amount': amt})
                inc_total += amt
        for a in Account.objects.filter(is_group=False, type='expense'):
            d, c = _sums(_line_qs(a, frm, to))
            amt = _opening_signed(a) + (d - c)  # debit positive
            if amt:
                expense.append({'name': a.name, 'amount': amt})
                exp_total += amt
        return Response({
            'income': income, 'expense': expense,
            'income_total': inc_total, 'expense_total': exp_total,
            'net_profit': inc_total - exp_total,
        })


class BalanceSheetView(APIView):
    def get(self, request):
        to = request.query_params.get('to')

        def side(type_, credit_positive):
            items, total = [], D0
            for a in Account.objects.filter(is_group=False, type=type_):
                d, c = _sums(_line_qs(a, None, to))
                net = _opening_signed(a) + (d - c)
                amt = -net if credit_positive else net
                if amt:
                    items.append({'name': a.name, 'amount': amt})
                    total += amt
            return items, total

        assets, assets_total = side('asset', False)
        liabilities, liab_total = side('liability', True)
        equity, equity_total = side('equity', True)

        # current period profit folds into equity
        inc_total = exp_total = D0
        for a in Account.objects.filter(is_group=False, type='income'):
            d, c = _sums(_line_qs(a, None, to))
            inc_total += -((_opening_signed(a)) + (d - c))
        for a in Account.objects.filter(is_group=False, type='expense'):
            d, c = _sums(_line_qs(a, None, to))
            exp_total += _opening_signed(a) + (d - c)
        net_profit = inc_total - exp_total
        if net_profit:
            equity.append({'name': 'Current Period Profit', 'amount': net_profit})
            equity_total += net_profit

        return Response({
            'assets': assets, 'assets_total': assets_total,
            'liabilities': liabilities, 'liabilities_total': liab_total,
            'equity': equity, 'equity_total': equity_total,
            'liab_equity_total': liab_total + equity_total,
        })


class AccountLedgerView(APIView):
    def get(self, request, code):
        a = Account.objects.filter(code=code).first()
        if not a:
            return Response({'error': 'not found'}, status=404)
        frm, to = _range(request)
        opening = _opening_signed(a)
        bal = opening
        rows = []
        for ln in _line_qs(a, frm, to).select_related('entry', 'party').order_by('entry__date', 'id'):
            bal += (ln.debit - ln.credit)
            rows.append({
                'date': ln.entry.date, 'number': ln.entry.number,
                'narration': ln.narration or ln.entry.narration,
                'party': ln.party.name if ln.party else '',
                'debit': ln.debit, 'credit': ln.credit, 'balance': bal,
            })
        return Response({'account': {'code': a.code, 'name': a.name, 'type': a.type},
                         'opening': opening, 'rows': rows, 'closing': bal})


class PartyLedgerView(APIView):
    def get(self, request, party_id):
        from invoicing.models import Party
        p = Party.objects.filter(id=party_id).first()
        if not p:
            return Response({'error': 'not found'}, status=404)
        frm, to = _range(request)
        opening = p.opening_balance or D0
        bal = opening
        rows = []
        for ln in _line_qs(None, frm, to, party=p).select_related('entry', 'account').order_by('entry__date', 'id'):
            bal += (ln.debit - ln.credit)
            rows.append({
                'date': ln.entry.date, 'number': ln.entry.number,
                'account': ln.account.name,
                'narration': ln.narration or ln.entry.narration,
                'debit': ln.debit, 'credit': ln.credit, 'balance': bal,
            })
        return Response({'party': {'id': p.id, 'name': p.name, 'phone': p.phone},
                         'opening': opening, 'rows': rows, 'closing': bal})


class AgingView(APIView):
    """Receivables & Payables aging: 0-30 / 31-90 / 90+ days."""
    def get(self, request):
        from invoicing.models import Invoice
        today = timezone.now().date()

        def build(type_):
            rows = {}
            for inv in Invoice.objects.filter(invoice_type=type_).select_related('party'):
                bal = float(inv.balance_due or 0)
                if bal <= 0:
                    continue
                age = (today - inv.date).days
                bucket = 'b0' if age <= 30 else ('b1' if age <= 90 else 'b2')
                r = rows.setdefault(inv.party.name, {'party': inv.party.name, 'b0': 0, 'b1': 0, 'b2': 0, 'total': 0})
                r[bucket] += bal
                r['total'] += bal
            return sorted(rows.values(), key=lambda x: -x['total'])

        return Response({'receivables': build('sale'), 'payables': build('purchase')})


class TaxSummaryView(APIView):
    """GST / sales-tax summary: output tax (sales) vs input tax (purchases)."""
    def get(self, request):
        from invoicing.models import Invoice
        frm = request.query_params.get('from')
        to = request.query_params.get('to')
        qs = Invoice.objects.all()
        if frm:
            qs = qs.filter(date__gte=frm)
        if to:
            qs = qs.filter(date__lte=to)
        sales = qs.filter(invoice_type='sale')
        purch = qs.filter(invoice_type='purchase')

        def agg(q):
            from django.db.models import Sum
            a = q.aggregate(taxable=Sum('subtotal'), tax=Sum('tax_amount'), total=Sum('grand_total'))
            return {'taxable': a['taxable'] or D0, 'tax': a['tax'] or D0, 'total': a['total'] or D0}

        out = agg(sales)
        inp = agg(purch)
        return Response({
            'output_tax': out, 'input_tax': inp,
            'net_tax': (out['tax'] - inp['tax']),
        })


class CashBookView(APIView):
    def get(self, request):
        frm, to = _range(request)
        result = {}
        for code in (svc.CASH, svc.BANK):
            a = svc.acc(code)
            if not a:
                continue
            bal = _opening_signed(a)
            rows = []
            for ln in _line_qs(a, frm, to).select_related('entry').order_by('entry__date', 'id'):
                bal += (ln.debit - ln.credit)
                rows.append({'date': ln.entry.date, 'number': ln.entry.number,
                             'narration': ln.narration or ln.entry.narration,
                             'in': ln.debit, 'out': ln.credit, 'balance': bal})
            result[a.name] = {'rows': rows, 'closing': bal}
        return Response(result)
