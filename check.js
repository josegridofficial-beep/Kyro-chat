(() => {
  const API = "https://chat-backend-l0nt.onrender.com";
  const token = localStorage.getItem("kyro.token") || localStorage.getItem("kyro_token") || "";
  const list = document.querySelector("#checkList"); const error = document.querySelector("#checkError");
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  async function run() {
    if (!token) { location.replace("login.html"); return; }
    error.textContent = ""; list.innerHTML = '<div class="check-card loading"></div>'.repeat(5);
    try { const response = await fetch(`${API}/api/admin/security/checks`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Unable to run checks"); const checks = Array.isArray(data.checks) ? data.checks : Object.entries(data.checks || data).map(([name, value]) => ({ name, ...(typeof value === "object" ? value : { ok: Boolean(value) }) })); list.innerHTML = checks.map((item) => { const rawStatus = String(item.severity || item.status || (item.ok ? "pass" : "warning")).toLowerCase(); const status = rawStatus === "ok" ? "pass" : rawStatus === "fail" ? "critical" : rawStatus; const label = status === "pass" ? "Pass" : status === "critical" ? "Critical" : "Warning"; return `<article class="check-card ${esc(status)}"><div class="check-top"><h2 class="check-name">${esc(item.name || "Service check")}</h2><span class="badge">${label}</span></div><p class="check-detail">${esc(item.detail || item.message || (label === "Pass" ? "Configured and responding." : "Review this service configuration."))}</p></article>`; }).join(""); document.querySelector("#checkedAt").textContent = `Last checked ${new Date().toLocaleTimeString()}`; } catch (err) { error.textContent = err.message; if (/admin|auth|forbidden|token/i.test(err.message)) setTimeout(() => location.replace("app.html"), 1200); }
  }
  document.querySelector("#runChecks").addEventListener("click", run); run();
})();
