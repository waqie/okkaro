from rest_framework import serializers
from .models import Post


class PostListSerializer(serializers.ModelSerializer):
    tag_list = serializers.ReadOnlyField()

    class Meta:
        model = Post
        fields = ['id', 'title', 'slug', 'excerpt', 'cover_base64', 'tags', 'tag_list',
                  'author', 'published', 'pub_date']


class PostSerializer(serializers.ModelSerializer):
    tag_list = serializers.ReadOnlyField()

    class Meta:
        model = Post
        fields = ['id', 'title', 'slug', 'excerpt', 'content', 'cover_base64', 'tags', 'tag_list',
                  'author', 'meta_title', 'meta_description', 'published', 'pub_date',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
