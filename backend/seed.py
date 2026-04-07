"""
Run this once after migrations to create demo users and firewall rules:
  python seed.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import FirewallRule, SecurityLog

# ── Users ──────────────────────────────────────────────────────────────────
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@demo.com', 'Admin@123')
    print("✅ Admin user created  →  username: admin  |  password: Admin@123")

if not User.objects.filter(username='user1').exists():
    User.objects.create_user('user1', 'user1@demo.com', 'User@123')
    print("✅ Regular user created →  username: user1  |  password: User@123")

# ── Firewall Rules ──────────────────────────────────────────────────────────
rules = [
    ('192.168.1.100', 'BLOCK', 'Known attacker IP'),
    ('10.0.0.99',     'BLOCK', 'Suspicious internal host'),
    ('203.0.113.5',   'BLOCK', 'Blacklisted external IP'),
    ('172.16.0.1',    'ALLOW', 'Internal trusted gateway'),
]
for ip, action, desc in rules:
    FirewallRule.objects.get_or_create(ip_address=ip, defaults={'action': action, 'description': desc})
    print(f"{'🚫' if action == 'BLOCK' else '✅'} Firewall rule: {ip} → {action}")

print("\n🎉 Database seeded! Run the server with:  python manage.py runserver")
