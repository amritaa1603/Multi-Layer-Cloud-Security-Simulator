# 🔐 Multi-Layer Cloud Security Simulator
### Defence in Depth — IaaS · PaaS · SaaS
---

## 🗂 Project Structure

```
cloud-security-simulator/
├── backend/                  ← Django REST API
│   ├── api/
│   │   ├── models.py         ← SecurityLog, FirewallRule
│   │   ├── serializers.py    ← DRF serializers
│   │   ├── views.py          ← All API endpoints
│   │   └── urls.py           ← URL routing
│   ├── core/
│   │   ├── settings.py       ← Django settings
│   │   └── urls.py           ← Root URL conf
│   ├── seed.py               ← Create demo users + rules
│   └── requirements.txt
└── frontend/                 ← React + Vite
    ├── src/
    │   ├── App.jsx            ← Full dashboard UI
    │   └── main.jsx          ← Entry point
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## ⚙️ Setup Instructions

### Step 1 — Backend (Django)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Create Django project files (run once)
django-admin startproject core .
python manage.py startapp api

# Run migrations
python manage.py makemigrations api
python manage.py migrate

# Seed database (demo users + firewall rules)
python seed.py

# Start backend server
python manage.py runserver
```

Backend runs at: **http://127.0.0.1:8000**

### Step 2 — Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## 👤 Demo Accounts

| Username | Password   | Role  | Can do                          |
|----------|------------|-------|---------------------------------|
| admin    | Admin@123  | Admin | All features + manage firewall  |
| user1    | User@123   | User  | Basic features only (RBAC demo) |

---

## 🔌 API Endpoints

### IaaS Layer — Infrastructure
| Method | Endpoint               | Auth     | Description               |
|--------|------------------------|----------|---------------------------|
| POST   | /api/iaas/check-ip/    | None     | Firewall IP check         |
| GET    | /api/iaas/firewall-rules/ | Admin | List rules               |
| POST   | /api/iaas/firewall-rules/ | Admin | Add rule                 |
| DELETE | /api/iaas/firewall-rules/ | Admin | Delete rule              |

### PaaS Layer — Platform
| Method | Endpoint                  | Auth     | Description               |
|--------|---------------------------|----------|---------------------------|
| POST   | /api/paas/login/          | None     | JWT login                 |
| POST   | /api/paas/admin-upload/   | JWT      | RBAC upload (admin only)  |
| POST   | /api/paas/validate-token/ | None     | API token check           |

### SaaS Layer — Application
| Method | Endpoint                   | Auth  | Description               |
|--------|----------------------------|-------|---------------------------|
| POST   | /api/saas/validate-input/  | None  | SQL/XSS injection check   |
| POST   | /api/saas/encrypt/         | None  | Encryption demo           |

### Dashboard
| Method | Endpoint      | Auth  | Description            |
|--------|---------------|-------|------------------------|
| GET    | /api/logs/    | JWT   | Security event logs    |
| GET    | /api/stats/   | None  | Attack stats           |

---

## 🎯 Features to Demo

### IaaS Layer
1. Enter IP `192.168.1.100` → Shows **BLOCKED** (in firewall rules)
2. Enter IP `8.8.8.8` → Shows **ALLOWED**
3. Login as admin → Add your own BLOCK/ALLOW rules

### PaaS Layer
4. Login with `admin / Admin@123` → Gets JWT token + admin role
5. Login with `hacker / wrong123` → Authentication **BLOCKED**
6. Try Admin Upload as regular user → **RBAC DENIED**
7. Enter wrong API token → **BLOCKED**; correct token → **ALLOWED**

### SaaS Layer
8. Enter `' OR 1=1 --` → **SQL Injection BLOCKED**
9. Enter `<script>alert('xss')</script>` → **XSS BLOCKED**
10. Enter `john_doe` → **Clean input allowed**
11. Encrypt text → See cipher transformation

### Logs Dashboard
12. All attacks auto-logged → View live table
13. Stats cards show counts by layer

---

## 📖 Defence in Depth Explained

```
Internet Traffic
      ↓
┌─────────────────────────────────┐
│  IaaS Layer (Infrastructure)    │  ← Firewalls, IP rules, NSGs
│  Block: malicious IPs, ports    │
└────────────┬────────────────────┘
             ↓ (passes IaaS)
┌─────────────────────────────────┐
│  PaaS Layer (Platform)          │  ← Auth, RBAC, API tokens
│  Block: bad creds, wrong roles  │
└────────────┬────────────────────┘
             ↓ (passes PaaS)
┌─────────────────────────────────┐
│  SaaS Layer (Application)       │  ← Input validation, encryption
│  Block: SQL injection, XSS      │
└────────────┬────────────────────┘
             ↓ (all checks passed)
         ✅ SECURE ACCESS
```

Even if one layer is bypassed, the next layer catches the attack.
This is the core principle of **Defence in Depth**.

---

## 🛠 Tech Stack
- **Frontend**: React 18, Vite, JetBrains Mono font
- **Backend**: Django 4.2, Django REST Framework
- **Auth**: JWT (djangorestframework-simplejwt)
- **Database**: SQLite (zero-config, dev-ready)
- **Security**: CORS headers, RBAC, input regex, JWT

---

## 📊 For Your Report / Viva

**Key concepts to mention:**
- CIA Triad (Confidentiality, Integrity, Availability)
- Shared Responsibility Model
- Principle of Least Privilege (RBAC)
- Zero Trust Architecture
- OWASP Top 10 (SQL injection, XSS are #3 and #7)
- NIST Cybersecurity Framework

**Real cloud tools that do this:**
- IaaS: AWS Security Groups, Azure NSG, GCP Firewall Rules
- PaaS: AWS Cognito, Azure AD, Auth0
- SaaS: AWS WAF, Cloudflare, Google reCAPTCHA
