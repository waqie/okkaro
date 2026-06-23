from django.db import models
from django.utils.text import slugify
from django.utils import timezone


class Post(models.Model):
    """Company marketing blog post. Lives in the PUBLIC schema (shared) and is
    managed only by the OKKARO owner — separate from any business data."""
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    excerpt = models.CharField(max_length=300, blank=True, help_text='Short summary shown on cards & search results')
    content = models.TextField(help_text='Markdown supported')
    cover_base64 = models.TextField(blank=True, default='')  # cover image (data URL)
    tags = models.CharField(max_length=200, blank=True, help_text='Comma-separated')
    author = models.CharField(max_length=100, default='OKKARO Team')

    # SEO
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)

    published = models.BooleanField(default=False)
    pub_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-pub_date']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:200] or 'post'
            slug = base
            i = 1
            while Post.objects.exclude(pk=self.pk).filter(slug=slug).exists():
                slug = f'{base}-{i}'; i += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def tag_list(self):
        return [t.strip() for t in self.tags.split(',') if t.strip()]

    def __str__(self):
        return self.title
