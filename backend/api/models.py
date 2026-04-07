from django.db import models
from django.contrib.auth.models import User


class SecurityLog(models.Model):
    ATTACK_TYPES = [
        ('BRUTE_FORCE', 'Brute Force'),
        ('SQL_INJECTION', 'SQL Injection'),
        ('XSS', 'Cross-Site Scripting'),
        ('UNAUTHORIZED', 'Unauthorized Access'),
        ('IP_BLOCKED', 'IP Blocked'),
        ('INVALID_TOKEN', 'Invalid API Token'),
    ]

    LAYER_CHOICES = [
        ('IaaS', 'Infrastructure Layer'),
        ('PaaS', 'Platform Layer'),
        ('SaaS', 'Application Layer'),
    ]

    STATUS_CHOICES = [
        ('BLOCKED', 'Blocked'),
        ('ALLOWED', 'Allowed'),
        ('WARNING', 'Warning'),
    ]

    attack_type   = models.CharField(max_length=50, choices=ATTACK_TYPES)
    layer         = models.CharField(max_length=10, choices=LAYER_CHOICES)
    status        = models.CharField(max_length=10, choices=STATUS_CHOICES)
    source_ip     = models.GenericIPAddressField(null=True, blank=True)
    detail        = models.TextField()
    user          = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    timestamp     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.layer}] {self.attack_type} — {self.status} @ {self.timestamp}"


class FirewallRule(models.Model):
    ip_address  = models.GenericIPAddressField(unique=True)
    action      = models.CharField(max_length=10, choices=[('ALLOW', 'Allow'), ('BLOCK', 'Block')])
    description = models.CharField(max_length=200, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ip_address} → {self.action}"
