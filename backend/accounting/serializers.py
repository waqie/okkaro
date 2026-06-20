from rest_framework import serializers
from .models import Account, JournalEntry, JournalLine, Expense


class AccountSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True)

    class Meta:
        model = Account
        fields = '__all__'


class JournalLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_code = serializers.CharField(source='account.code', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)

    class Meta:
        model = JournalLine
        exclude = ['entry']


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True, read_only=True)
    total_debit = serializers.ReadOnlyField()
    total_credit = serializers.ReadOnlyField()

    class Meta:
        model = JournalEntry
        fields = '__all__'


class ExpenseSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    paid_from_name = serializers.CharField(source='paid_from.name', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['journal_entry']
