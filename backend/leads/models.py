from django.db import models


class Lead(models.Model):
    """A sales lead from the website contact form. Lives in the PUBLIC schema
    (shared) — only the OKKARO owner sees these."""
    STATUS = [('new', 'New'), ('contacted', 'Contacted'), ('converted', 'Converted'), ('lost', 'Lost')]

    name = models.CharField(max_length=150)
    business_name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    plan_interest = models.CharField(max_length=30, blank=True)
    message = models.TextField(blank=True)
    source = models.CharField(max_length=50, default='website')
    status = models.CharField(max_length=20, choices=STATUS, default='new')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.status})'
