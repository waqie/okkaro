from rest_framework import serializers
from .models import Party, Invoice, InvoiceItem, Payment, Quotation, QuotationItem

class PartySerializer(serializers.ModelSerializer):
    current_balance = serializers.ReadOnlyField()
    class Meta:
        model = Party
        fields = '__all__'

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        exclude = ['invoice']
        read_only_fields = ['total']

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    party_phone = serializers.CharField(source='party.phone', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['invoice_number', 'subtotal', 'discount_amount', 
                           'tax_amount', 'grand_total', 'balance_due']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        # Auto-generate invoice number
        last = Invoice.objects.order_by('-id').first()
        num = (last.id + 1) if last else 1
        inv_type = validated_data.get('invoice_type', 'sale')
        prefix = 'SI' if inv_type == 'sale' else 'PI'
        validated_data['invoice_number'] = f"{prefix}-{num:05d}"
        
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        invoice.calculate_totals()
        invoice.save()
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)
        instance.calculate_totals()
        instance.save()
        return instance

class PaymentSerializer(serializers.ModelSerializer):
    party_name = serializers.CharField(source='party.name', read_only=True)
    class Meta:
        model = Payment
        fields = '__all__'


class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        exclude = ['quotation']
        read_only_fields = ['total']


class QuotationSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True)
    party_name = serializers.CharField(source='party.name', read_only=True)
    party_phone = serializers.CharField(source='party.phone', read_only=True)

    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = ['number', 'subtotal', 'discount_amount', 'tax_amount',
                            'grand_total', 'converted_invoice', 'status']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        last = Quotation.objects.order_by('-id').first()
        num = (last.id + 1) if last else 1
        validated_data['number'] = f"QO-{num:05d}"
        quotation = Quotation.objects.create(**validated_data)
        for item in items_data:
            QuotationItem.objects.create(quotation=quotation, **item)
        quotation.calculate_totals()
        quotation.save()
        return quotation
