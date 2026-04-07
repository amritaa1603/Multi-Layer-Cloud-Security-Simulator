from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # IaaS — Firewall
    path('iaas/check-ip/',       views.check_ip,       name='check-ip'),
    path('iaas/firewall-rules/', views.firewall_rules,  name='firewall-rules'),

    # PaaS — Auth / RBAC / Tokens
    path('paas/login/',          views.login_view,      name='login'),
    path('paas/token/refresh/',  TokenRefreshView.as_view(), name='token-refresh'),
    path('paas/admin-upload/',   views.admin_upload,    name='admin-upload'),
    path('paas/validate-token/', views.validate_token,  name='validate-token'),

    # SaaS — Input / Encryption / Logging
    path('saas/validate-input/', views.validate_input,  name='validate-input'),
    path('saas/encrypt/',        views.encrypt_demo,    name='encrypt-demo'),

    # Dashboard
    path('logs/',                views.get_logs,        name='get-logs'),
    path('stats/',               views.get_stats,       name='get-stats'),
]
