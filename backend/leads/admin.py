from django.contrib import admin
from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'business_name', 'plan_interest', 'status', 'created_at')
    list_filter = ('status', 'plan_interest', 'created_at')
    search_fields = ('name', 'phone', 'business_name', 'message')
