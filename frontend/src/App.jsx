import { useState, useEffect, useRef } from "react";

// ── API base ─────────────────────────────────────────────────────────────────
const API = "https://multi-layer-cloud-security-simulator-1.onrender.com/api";
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("access");
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ── Tiny components ───────────────────────────────────────────────────────────
function Badge({ text, color }) {
  const colors = {
    green:  { bg: "#0d2b1a", border: "#1a5c35", text: "#4ade80" },
    red:    { bg: "#2b0d0d", border: "#5c1a1a", text: "#f87171" },
    yellow: { bg: "#2b2200", border: "#5c4500", text: "#fbbf24" },
    blue:   { bg: "#0d1a2b", border: "#1a3a5c", text: "#60a5fa" },
    purple: { bg: "#1a0d2b", border: "#3a1a5c", text: "#c084fc" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em"
    }}>{text}</span>
  );
}

function ResultBox({ result }) {
  if (!result) return null;
  const isGood = result.result === "ALLOWED" || result.safe === true || result.valid === true || result.ok;
  const isBad  = result.result === "BLOCKED" || result.safe === false || result.valid === false || result.error;
  const color  = isGood ? "#4ade80" : isBad ? "#f87171" : "#fbbf24";
  const bg     = isGood ? "#0d2b1a" : isBad ? "#2b0d0d" : "#2b2200";
  const border = isGood ? "#1a5c35" : isBad ? "#5c1a1a" : "#5c4500";

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 10,
      padding: "14px 18px", marginTop: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 13
    }}>
      <div style={{ color, fontWeight: 700, marginBottom: 6 }}>
        {result.message || result.error || JSON.stringify(result).slice(0, 120)}
      </div>
      {result.layer && (
        <div style={{ color: "#94a3b8", fontSize: 11 }}>
          Layer: <span style={{ color: "#60a5fa" }}>{result.layer}</span>
          {result.reason && <> &nbsp;·&nbsp; {result.reason}</>}
          {result.threat && <> &nbsp;·&nbsp; Threat: <span style={{ color: "#f87171" }}>{result.threat}</span></>}
        </div>
      )}
      {result.result && (
        <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
          Verdict: <span style={{ color }}>{result.result}</span>
          &nbsp;·&nbsp; IP: <span style={{ color: "#e2e8f0" }}>{result.ip}</span>
        </div>
      )}
      {result.role && (
        <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
          Role: <span style={{ color: "#c084fc" }}>{result.role.toUpperCase()}</span>
          &nbsp;·&nbsp; User: <span style={{ color: "#e2e8f0" }}>{result.username}</span>
        </div>
      )}
      {result.original && (
        <div style={{ marginTop: 8 }}>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>Original → <span style={{ color: "#fbbf24" }}>{result.original}</span></div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>Result &nbsp;&nbsp;→ <span style={{ color: "#4ade80" }}>{result.result_text || result.result || result.sanitized}</span></div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
      padding: "18px 20px", flex: 1, minWidth: 120
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, color }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: `${color}18`,
          border: `1px solid ${color}40`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 18
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.02em" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", mono }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "#0a0f1e", border: "1px solid #1e293b",
          borderRadius: 8, padding: "10px 14px", color: "#e2e8f0",
          fontSize: 13, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
          outline: "none", boxSizing: "border-box",
          transition: "border-color 0.2s"
        }}
        onFocus={e => e.target.style.borderColor = "#3b82f6"}
        onBlur={e => e.target.style.borderColor = "#1e293b"}
      />
    </div>
  );
}

function ActionButton({ onClick, loading, children, color = "#3b82f6", disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{
      background: `${color}18`, border: `1px solid ${color}50`, color,
      padding: "10px 20px", borderRadius: 8, cursor: loading ? "wait" : "pointer",
      fontSize: 13, fontWeight: 600, width: "100%", marginTop: 4,
      transition: "all 0.2s", opacity: loading ? 0.7 : 1,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.03em"
    }}
      onMouseEnter={e => !loading && (e.target.style.background = `${color}30`)}
      onMouseLeave={e => !loading && (e.target.style.background = `${color}18`)}
    >
      {loading ? "⟳ Processing..." : children}
    </button>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e293b",
      borderRadius: 14, padding: "22px 24px", ...style
    }}>{children}</div>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

function IaaSSection({ token }) {
  const [ip, setIp] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [newIp, setNewIp] = useState("");
  const [newAction, setNewAction] = useState("BLOCK");
  const [newDesc, setNewDesc] = useState("");

  const checkIp = async () => {
    setLoading(true);
    const r = await apiFetch("/iaas/check-ip/", { method: "POST", body: JSON.stringify({ ip }) });
    setResult(r.data);
    setLoading(false);
  };

  const loadRules = async () => {
    if (!token) return;
    const r = await apiFetch("/iaas/firewall-rules/");
    if (r.ok) setRules(r.data);
  };

  const addRule = async () => {
    await apiFetch("/iaas/firewall-rules/", {
      method: "POST",
      body: JSON.stringify({ ip_address: newIp, action: newAction, description: newDesc })
    });
    setNewIp(""); setNewDesc("");
    loadRules();
  };

  const deleteRule = async (id) => {
    await apiFetch("/iaas/firewall-rules/", { method: "DELETE", body: JSON.stringify({ id }) });
    loadRules();
  };

  useEffect(() => { loadRules(); }, [token]);

  const demoIPs = ["192.168.1.100", "10.0.0.99", "8.8.8.8", "203.0.113.5"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <SectionHeader icon="🧱" title="Firewall IP Check" subtitle="Simulate allow/block at network perimeter" color="#3b82f6" />
        <InputField label="IP Address to Test" value={ip} onChange={setIp} placeholder="e.g. 192.168.1.100" mono />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {demoIPs.map(d => (
            <button key={d} onClick={() => setIp(d)} style={{
              background: "#1e293b", border: "1px solid #334155", color: "#94a3b8",
              padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace"
            }}>{d}</button>
          ))}
        </div>
        <ActionButton onClick={checkIp} loading={loading} color="#3b82f6">CHECK FIREWALL →</ActionButton>
        <ResultBox result={result} />
      </Card>

      <Card>
        <SectionHeader icon="📋" title="Firewall Rules" subtitle="Admin: manage block/allow rules" color="#f59e0b" />
        {token ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
              <input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="IP address"
                style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 6, padding: "7px 10px", color: "#e2e8f0", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }} />
              <select value={newAction} onChange={e => setNewAction(e.target.value)}
                style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 6, padding: "7px 10px", color: "#e2e8f0", fontSize: 12 }}>
                <option value="BLOCK">BLOCK</option>
                <option value="ALLOW">ALLOW</option>
              </select>
            </div>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description"
              style={{ width: "100%", background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 6, padding: "7px 10px", color: "#e2e8f0", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }} />
            <ActionButton onClick={addRule} color="#f59e0b">+ ADD RULE</ActionButton>
            <div style={{ marginTop: 14, maxHeight: 220, overflowY: "auto" }}>
              {rules.map(r => (
                <div key={r.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid #1e293b", fontSize: 12
                }}>
                  <div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>{r.ip_address}</span>
                    <span style={{ color: "#64748b", marginLeft: 8 }}>{r.description}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Badge text={r.action} color={r.action === "BLOCK" ? "red" : "green"} />
                    <button onClick={() => deleteRule(r.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                </div>
              ))}
              {rules.length === 0 && <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: 16 }}>No rules yet. Login as admin to manage.</div>}
            </div>
          </>
        ) : (
          <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
            🔒 Login as <strong style={{ color: "#f59e0b" }}>admin</strong> to manage firewall rules
          </div>
        )}
      </Card>
    </div>
  );
}

function PaaSSection({ setToken, token, setRole, role }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginResult, setLoginResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [tokenResult, setTokenResult] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const login = async () => {
    setLoading(true);
    const r = await apiFetch("/paas/login/", { method: "POST", body: JSON.stringify({ username, password }) });
    setLoginResult(r.data);
    if (r.ok) {
      localStorage.setItem("access", r.data.access);
      setToken(r.data.access);
      setRole(r.data.role);
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("access");
    setToken(null); setRole(null); setLoginResult(null);
  };

  const checkToken = async () => {
    const r = await apiFetch("/paas/validate-token/", { method: "POST", body: JSON.stringify({ token: apiToken }) });
    setTokenResult(r.data);
  };

  const tryAdminUpload = async () => {
    const r = await apiFetch("/paas/admin-upload/", { method: "POST", body: JSON.stringify({ data: "sample-dataset.csv" }) });
    setUploadResult(r.data);
  };

  const demoAccounts = [
    { u: "admin", p: "Admin@123", role: "admin" },
    { u: "user1", p: "User@123", role: "user" },
    { u: "hacker", p: "wrong123", role: "?" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <SectionHeader icon="🔐" title="Authentication & RBAC" subtitle="JWT login with role-based access control" color="#a855f7" />
        {!token ? (
          <>
            <InputField label="Username" value={username} onChange={setUsername} placeholder="admin or user1" />
            <InputField label="Password" value={password} onChange={setPassword} placeholder="password" type="password" />
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {demoAccounts.map(a => (
                <button key={a.u} onClick={() => { setUsername(a.u); setPassword(a.p); }} style={{
                  background: "#1e293b", border: "1px solid #334155", color: "#94a3b8",
                  padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer"
                }}>Try: {a.u}</button>
              ))}
            </div>
            <ActionButton onClick={login} loading={loading} color="#a855f7">LOGIN →</ActionButton>
          </>
        ) : (
          <div>
            <div style={{ background: "#0d2b1a", border: "1px solid #1a5c35", borderRadius: 10, padding: "14px 18px", marginBottom: 12 }}>
              <div style={{ color: "#4ade80", fontWeight: 700, marginBottom: 6 }}>✅ Logged in successfully</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Role: <Badge text={role?.toUpperCase() || "USER"} color={role === "admin" ? "purple" : "blue"} />
              </div>
            </div>
            <ActionButton onClick={logout} color="#ef4444">LOGOUT</ActionButton>
          </div>
        )}
        <ResultBox result={loginResult} />
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <SectionHeader icon="🛡" title="Role-Based Upload" subtitle="Only admin role can upload data" color="#10b981" />
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
            Current role: {role ? <Badge text={role.toUpperCase()} color={role === "admin" ? "purple" : "blue"} /> : <span style={{ color: "#475569" }}>Not logged in</span>}
          </div>
          <ActionButton onClick={tryAdminUpload} color="#10b981" disabled={!token}>
            {role === "admin" ? "UPLOAD AS ADMIN →" : "TRY UPLOAD (RBAC TEST) →"}
          </ActionButton>
          <ResultBox result={uploadResult} />
        </Card>

        <Card>
          <SectionHeader icon="🔑" title="API Token Validation" subtitle="Test token-based API security" color="#f59e0b" />
          <InputField label="API Token" value={apiToken} onChange={setApiToken} placeholder="SECURE-API-TOKEN-2024" mono />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => setApiToken("SECURE-API-TOKEN-2024")} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Valid token</button>
            <button onClick={() => setApiToken("wrong-token")} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Wrong token</button>
          </div>
          <ActionButton onClick={checkToken} color="#f59e0b">VALIDATE TOKEN →</ActionButton>
          <ResultBox result={tokenResult} />
        </Card>
      </div>
    </div>
  );
}

function SaaSSection() {
  const [input, setInput] = useState("");
  const [field, setField] = useState("username");
  const [inputResult, setInputResult] = useState(null);
  const [encText, setEncText] = useState("");
  const [encResult, setEncResult] = useState(null);
  const [loading1, setLoading1] = useState(false);

  const checkInput = async () => {
    setLoading1(true);
    const r = await apiFetch("/saas/validate-input/", { method: "POST", body: JSON.stringify({ input, field }) });
    setInputResult(r.data);
    setLoading1(false);
  };

  const encrypt = async (action) => {
    const r = await apiFetch("/saas/encrypt/", { method: "POST", body: JSON.stringify({ text: encText, action }) });
    setEncResult({ ...r.data, original: r.data?.original, result_text: r.data?.result });
  };

  const attacks = [
    { label: "SQL Injection", value: "' OR 1=1 --", field: "username" },
    { label: "DROP TABLE",    value: "'; DROP TABLE users; --", field: "username" },
    { label: "Union Select",  value: "' UNION SELECT * FROM users", field: "search" },
    { label: "XSS Script",    value: "<script>alert('xss')</script>", field: "comment" },
    { label: "Clean input",   value: "john_doe_2024", field: "username" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <SectionHeader icon="🛡" title="Input Validation & Attack Detection" subtitle="SQL injection and XSS prevention at SaaS layer" color="#ef4444" />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Field Type</label>
          <select value={field} onChange={e => setField(e.target.value)} style={{
            background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px",
            color: "#e2e8f0", fontSize: 13, width: "100%", marginBottom: 10
          }}>
            <option value="username">Username</option>
            <option value="search">Search box</option>
            <option value="comment">Comment</option>
          </select>
          <InputField label="Input to Validate" value={input} onChange={setInput} placeholder="Type anything or try an attack..." mono />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {attacks.map(a => (
            <button key={a.label} onClick={() => { setInput(a.value); setField(a.field); }} style={{
              background: a.label === "Clean input" ? "#0d2b1a" : "#2b0d0d",
              border: `1px solid ${a.label === "Clean input" ? "#1a5c35" : "#5c1a1a"}`,
              color: a.label === "Clean input" ? "#4ade80" : "#f87171",
              padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer"
            }}>{a.label}</button>
          ))}
        </div>
        <ActionButton onClick={checkInput} loading={loading1} color="#ef4444">CHECK INPUT →</ActionButton>
        <ResultBox result={inputResult} />
      </Card>

      <Card>
        <SectionHeader icon="🔒" title="Encryption Demo" subtitle="Visualise data encryption at SaaS layer" color="#06b6d4" />
        <InputField label="Text to Encrypt / Decrypt" value={encText} onChange={setEncText} placeholder="Enter any text..." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <ActionButton onClick={() => encrypt("encrypt")} color="#06b6d4">ENCRYPT →</ActionButton>
          <ActionButton onClick={() => encrypt("decrypt")} color="#8b5cf6">DECRYPT →</ActionButton>
        </div>
        {encResult && (
          <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 18px", marginTop: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            <div style={{ color: "#64748b", marginBottom: 8, fontSize: 11 }}>{encResult.method}</div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#64748b" }}>INPUT : </span>
              <span style={{ color: "#fbbf24" }}>{encResult.original}</span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#64748b" }}>OUTPUT: </span>
              <span style={{ color: "#4ade80" }}>{encResult.result_text}</span>
            </div>
            <div style={{ color: "#06b6d4", marginTop: 8, fontSize: 11 }}>✅ {encResult.message}</div>
          </div>
        )}
        <div style={{ marginTop: 20, background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>🏭 Production Encryption Standards</div>
          {[
            ["Data at rest", "AES-256-GCM"],
            ["Data in transit", "TLS 1.3"],
            ["Passwords", "bcrypt / Argon2"],
            ["Keys", "AWS KMS / Azure Key Vault"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 0", borderBottom: "1px solid #1e293b" }}>
              <span style={{ color: "#94a3b8" }}>{k}</span>
              <span style={{ color: "#06b6d4", fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LogsSection({ token }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);

  const loadAll = async () => {
    const s = await apiFetch("/stats/");
    if (s.ok) setStats(s.data);
    if (token) {
      const l = await apiFetch("/logs/");
      if (l.ok) setLogs(l.data);
    }
  };

  useEffect(() => { loadAll(); const t = setInterval(loadAll, 5000); return () => clearInterval(t); }, [token]);

  const layerColor = { IaaS: "#3b82f6", PaaS: "#a855f7", SaaS: "#ef4444" };
  const statusColor = { BLOCKED: "#f87171", ALLOWED: "#4ade80", WARNING: "#fbbf24" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {stats && (
        <div style={{ display: "flex", gap: 12 }}>
          <StatCard label="Total Events" value={stats.total} color="#60a5fa" icon="📊" />
          <StatCard label="Blocked" value={stats.blocked} color="#f87171" icon="🚫" />
          <StatCard label="Allowed" value={stats.allowed} color="#4ade80" icon="✅" />
          {stats.by_layer?.map(l => (
            <StatCard key={l.layer} label={`${l.layer} Events`} value={l.count} color={layerColor[l.layer] || "#94a3b8"} icon="🔒" />
          ))}
        </div>
      )}
      <Card>
        <SectionHeader icon="📋" title="Live Security Logs" subtitle={token ? "Real-time events — refreshes every 5s" : "Login as admin to view full logs"} color="#10b981" />
        {token ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  {["Time", "Layer", "Attack Type", "Status", "Source IP", "Detail"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#475569", fontWeight: 500, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} style={{ borderBottom: "1px solid #0f172a" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#1e293b20"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{new Date(l.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: "8px 12px" }}><Badge text={l.layer} color={l.layer === "IaaS" ? "blue" : l.layer === "PaaS" ? "purple" : "red"} /></td>
                    <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{l.attack_type.replace("_", " ")}</td>
                    <td style={{ padding: "8px 12px" }}><Badge text={l.status} color={l.status === "BLOCKED" ? "red" : "green"} /></td>
                    <td style={{ padding: "8px 12px", color: "#60a5fa" }}>{l.source_ip}</td>
                    <td style={{ padding: "8px 12px", color: "#94a3b8", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.detail}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#475569" }}>No logs yet. Try some attacks!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
            🔒 Login as <strong style={{ color: "#a855f7" }}>admin</strong> to view security logs
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("iaas");
  const [token, setToken] = useState(localStorage.getItem("access"));
  const [role, setRole] = useState(null);

  const tabs = [
    { id: "iaas", label: "IaaS Layer", icon: "🧱", color: "#3b82f6", sub: "Infrastructure" },
    { id: "paas", label: "PaaS Layer", icon: "🔐", color: "#a855f7", sub: "Platform" },
    { id: "saas", label: "SaaS Layer", icon: "🛡", color: "#ef4444", sub: "Application" },
    { id: "logs", label: "Logs & Stats", icon: "📊", color: "#10b981", sub: "Dashboard" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#020817",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", color: "#e2e8f0",
    }}>
      {/* Import fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        select option { background: #0f172a; }
      `}</style>

      {/* Top nav */}
      <div style={{
        background: "#0a0f1e", borderBottom: "1px solid #1e293b",
        padding: "0 32px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
          }}>🔐</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "#f1f5f9" }}>
              Cloud Security Simulator
            </div>
            <div style={{ fontSize: 11, color: "#475569" }}>Defence in Depth · IaaS · PaaS · SaaS</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {token && (
            <Badge text={`${role?.toUpperCase() || "USER"} SESSION ACTIVE`} color={role === "admin" ? "purple" : "blue"} />
          )}
          <div style={{ width: 8, height: 8, borderRadius: 99, background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
          <span style={{ fontSize: 11, color: "#475569" }}>SYSTEM ONLINE</span>
        </div>
      </div>

      {/* Layer tabs */}
      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: "0 32px" }}>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer", padding: "16px 24px",
              borderBottom: `2px solid ${tab === t.id ? t.color : "transparent"}`,
              color: tab === t.id ? t.color : "#64748b", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1 }}>{t.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{t.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Layer info banner */}
        <div style={{
          background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
          padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center",
          gap: 16, flexWrap: "wrap"
        }}>
          {[
            { layer: "IaaS", desc: "Infrastructure — Firewalls, VMs, Network Security Groups", color: "#3b82f6" },
            { layer: "PaaS", desc: "Platform — Authentication, RBAC, API Security", color: "#a855f7" },
            { layer: "SaaS", desc: "Application — Input Validation, Encryption, Logging", color: "#ef4444" },
          ].map(l => (
            <div key={l.layer} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: l.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: l.color, fontFamily: "'JetBrains Mono', monospace" }}>{l.layer}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{l.desc}</span>
            </div>
          ))}
        </div>

        {tab === "iaas" && <IaaSSection token={token} />}
        {tab === "paas" && <PaaSSection setToken={setToken} token={token} setRole={setRole} role={role} />}
        {tab === "saas" && <SaaSSection />}
        {tab === "logs" && <LogsSection token={token} />}
      </div>
    </div>
  );
}
