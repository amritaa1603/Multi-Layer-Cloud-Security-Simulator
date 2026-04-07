from rest_framework import serializers
from django.contrib.auth.models import User
from .models import SecurityLog, FirewallRule


class SecurityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model  = SecurityLog
        fields = ['id', 'attack_type', 'layer', 'status', 'source_ip',
                  'detail', 'user_name', 'timestamp']

    def get_user_name(self, obj):
        return obj.user.username if obj.user else 'Anonymous'


class FirewallRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FirewallRule
        fields = ['id', 'ip_address', 'action', 'description', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'is_staff']
