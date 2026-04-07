import re
import secrets
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import SecurityLog, FirewallRule
from .serializers import SecurityLogSerializer, FirewallRuleSerializer, UserSerializer


# ── helpers ──────────────────────────────────────────────────────────────────

def _log(attack_type, layer, status_val, detail, request=None, ip=None):
    user = request.user if (request and request.user.is_authenticated) else None
    source_ip = ip or (request.META.get('REMOTE_ADDR') if request else '0.0.0.0')
    SecurityLog.objects.create(
        attack_type=attack_type,
        layer=layer,
        status=status_val,
        source_ip=source_ip,
        detail=detail,
        user=user,
    )


SQL_PATTERNS = [
    r"('|\")\s*or\s*('|\")?\d+('|\")?\s*=\s*('|\")?\d+",
    r"--\s*$",
    r";\s*drop\s+table",
    r"union\s+select",
    r"insert\s+into",
    r"delete\s+from",
    r"1\s*=\s*1",
]

XSS_PATTERNS = [
    r"<\s*script",
    r"javascript\s*:",
    r"on\w+\s*=",
    r"<\s*iframe",
]


def _has_sql(text):
    return any(re.search(p, text, re.IGNORECASE) for p in SQL_PATTERNS)


def _has_xss(text):
    return any(re.search(p, text, re.IGNORECASE) for p in XSS_PATTERNS)


# ── IaaS: Firewall / IP control ───────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def check_ip(request):
    """
    IaaS Layer — Firewall rule check.
    Body: { "ip": "x.x.x.x" }
    """
    ip = request.data.get('ip', '').strip()
    if not ip:
        return Response({'error': 'IP address required'}, status=400)

    rule = FirewallRule.objects.filter(ip_address=ip).first()

    if rule and rule.action == 'BLOCK':
        _log('IP_BLOCKED', 'IaaS', 'BLOCKED',
             f'Firewall blocked IP {ip}: {rule.description}', request, ip)
        return Response({
            'ip': ip, 'result': 'BLOCKED',
            'layer': 'IaaS',
            'reason': rule.description or 'Firewall rule: DENY',
            'message': f'🚫 IP {ip} is BLOCKED at the IaaS firewall layer.',
        })

    _log('IP_BLOCKED', 'IaaS', 'ALLOWED',
         f'IP {ip} passed firewall check', request, ip)
    return Response({
        'ip': ip, 'result': 'ALLOWED',
        'layer': 'IaaS',
        'reason': 'No block rule found — traffic permitted',
        'message': f'✅ IP {ip} is ALLOWED through the IaaS firewall.',
    })


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def firewall_rules(request):
    """Admin-only: list / add / delete firewall rules."""
    if not request.user.is_staff:
        _log('UNAUTHORIZED', 'IaaS', 'BLOCKED',
             'Non-admin tried to modify firewall rules', request)
        return Response({'error': 'Admin only'}, status=403)

    if request.method == 'GET':
        rules = FirewallRule.objects.all()
        return Response(FirewallRuleSerializer(rules, many=True).data)

    if request.method == 'POST':
        s = FirewallRuleSerializer(data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data, status=201)
        return Response(s.errors, status=400)

    if request.method == 'DELETE':
        rule_id = request.data.get('id')
        FirewallRule.objects.filter(id=rule_id).delete()
        return Response({'deleted': rule_id})


# ── PaaS: Auth / RBAC / API token ────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    PaaS Layer — Authentication + RBAC.
    Body: { "username": "...", "password": "..." }
    """
    username = request.data.get('username', '')
    password = request.data.get('password', '')

    if not username or not password:
        _log('UNAUTHORIZED', 'PaaS', 'BLOCKED',
             'Login attempt with empty credentials', request)
        return Response({'error': 'Username and password required'}, status=400)

    user = authenticate(username=username, password=password)
    if not user:
        _log('BRUTE_FORCE', 'PaaS', 'BLOCKED',
             f'Failed login attempt for username: {username}', request)
        return Response({
            'error': 'Invalid credentials',
            'layer': 'PaaS',
            'message': '🔐 Authentication FAILED — Blocked at PaaS layer.',
        }, status=401)

    refresh = RefreshToken.for_user(user)
    role    = 'admin' if user.is_staff else 'user'

    _log('UNAUTHORIZED', 'PaaS', 'ALLOWED',
         f'Successful login: {username} (role={role})', request)

    return Response({
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
        'role':    role,
        'username': user.username,
        'message': f'✅ Login successful. Role: {role.upper()}',
        'layer':   'PaaS',
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_upload(request):
    """
    PaaS Layer — RBAC: only admin can upload data.
    Body: { "data": "..." }
    """
    if not request.user.is_staff:
        _log('UNAUTHORIZED', 'PaaS', 'BLOCKED',
             f'User {request.user.username} attempted admin-only upload', request)
        return Response({
            'error':   'Forbidden',
            'layer':   'PaaS',
            'message': '🚫 Access DENIED — Only admin role can upload data. Blocked at PaaS layer.',
        }, status=403)

    _log('UNAUTHORIZED', 'PaaS', 'ALLOWED',
         f'Admin {request.user.username} uploaded data', request)
    return Response({
        'message': '✅ Data uploaded successfully by admin.',
        'layer':   'PaaS',
        'data_received': request.data.get('data', '')[:100],
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_token(request):
    """
    PaaS Layer — API token validation.
    Body: { "token": "..." }
    """
    token = request.data.get('token', '').strip()
    # In production use a real token store; here we check a demo token
    DEMO_VALID_TOKEN = 'SECURE-API-TOKEN-2024'

    if token != DEMO_VALID_TOKEN:
        _log('INVALID_TOKEN', 'PaaS', 'BLOCKED',
             f'Invalid API token attempt: {token[:20]}...', request)
        return Response({
            'valid':   False,
            'layer':   'PaaS',
            'message': '🚫 Invalid API token — Request BLOCKED at PaaS layer.',
        }, status=401)

    _log('INVALID_TOKEN', 'PaaS', 'ALLOWED',
         'Valid API token accepted', request)
    return Response({
        'valid':   True,
        'layer':   'PaaS',
        'message': '✅ API token valid — Access GRANTED at PaaS layer.',
    })


# ── SaaS: Input validation / Encryption demo / Logging ───────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def validate_input(request):
    """
    SaaS Layer — SQL injection & XSS detection.
    Body: { "input": "...", "field": "username|comment|search" }
    """
    user_input = request.data.get('input', '')
    field      = request.data.get('field', 'input')

    if _has_sql(user_input):
        _log('SQL_INJECTION', 'SaaS', 'BLOCKED',
             f'SQL injection in field "{field}": {user_input[:80]}', request)
        return Response({
            'safe':    False,
            'threat':  'SQL_INJECTION',
            'layer':   'SaaS',
            'message': f'🛑 SQL Injection detected in "{field}" — BLOCKED at SaaS layer.',
            'input':   user_input,
        })

    if _has_xss(user_input):
        _log('XSS', 'SaaS', 'BLOCKED',
             f'XSS in field "{field}": {user_input[:80]}', request)
        return Response({
            'safe':    False,
            'threat':  'XSS',
            'layer':   'SaaS',
            'message': f'🛑 XSS attack detected in "{field}" — BLOCKED at SaaS layer.',
            'input':   user_input,
        })

    _log('XSS', 'SaaS', 'ALLOWED',
         f'Input validation passed for field "{field}"', request)
    return Response({
        'safe':    True,
        'layer':   'SaaS',
        'message': f'✅ Input is clean — Passed SaaS validation.',
        'sanitized': user_input.strip(),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def encrypt_demo(request):
    """
    SaaS Layer — Basic encryption demo (Caesar cipher for visual demo).
    Body: { "text": "...", "action": "encrypt|decrypt" }
    """
    text   = request.data.get('text', '')
    action = request.data.get('action', 'encrypt')
    shift  = 13  # ROT13 for demo purposes

    def rot13(s):
        result = []
        for c in s:
            if c.isalpha():
                base = ord('A') if c.isupper() else ord('a')
                result.append(chr((ord(c) - base + shift) % 26 + base))
            else:
                result.append(c)
        return ''.join(result)

    processed = rot13(text)
    return Response({
        'original':  text,
        'result':    processed,
        'method':    'ROT-13 (Caesar Cipher — demo only; production uses AES-256)',
        'action':    action,
        'layer':     'SaaS',
        'message':   f'✅ Text {"encrypted" if action == "encrypt" else "decrypted"} at SaaS layer.',
    })


# ── Logs & Stats ──────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_logs(request):
    """Return last 50 security logs."""
    logs = SecurityLog.objects.all()[:50]
    return Response(SecurityLogSerializer(logs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_stats(request):
    """Dashboard stats — attack counts by layer and type."""
    total   = SecurityLog.objects.count()
    blocked = SecurityLog.objects.filter(status='BLOCKED').count()
    allowed = SecurityLog.objects.filter(status='ALLOWED').count()

    by_layer = list(
        SecurityLog.objects.values('layer')
        .annotate(count=Count('id'))
        .order_by('layer')
    )
    by_type = list(
        SecurityLog.objects.values('attack_type')
        .annotate(count=Count('id'))
        .order_by('-count')[:6]
    )

    return Response({
        'total': total,
        'blocked': blocked,
        'allowed': allowed,
        'by_layer': by_layer,
        'by_type': by_type,
    })
