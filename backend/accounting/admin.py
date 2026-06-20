from django.contrib import admin
from .models import Account, JournalEntry, JournalLine, Expense


class JournalLineInline(admin.TabularInline):
    model = JournalLine
    extra = 0


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ('number', 'date', 'type', 'narration')
    inlines = [JournalLineInline]


admin.site.register(Account)
admin.site.register(Expense)
