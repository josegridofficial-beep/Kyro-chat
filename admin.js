(() => {
  const API = "https://chat-backend-l0nt.onrender.com";
  const token = localStorage.getItem("kyro.token") || localStorage.getItem("kyro_token") || "";
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  let users = [];
  let activeUser = null;

  if (!token) { location.replace("login.html"); return; }

  async function api(path, options = {}) {
    const response = await fetch(API + path, { ...options, headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  }

  function initials(user) { return ((user.firstName || "")[0] + (user.lastName || "")[0]).toUpperCase() || "K"; }
  function date(value) { return value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"; }
  function showToast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2600); }
  function setView(view) {
    document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === `${view}View`));
    document.querySelectorAll(".nav-item[data-view]").forEach((el) => el.classList.toggle("active", el.dataset.view === view));
    $("#pageTitle").textContent = view === "users" ? "Users" : "Overview";
    if (view === "users") renderUsers();
    $("#sidebar").classList.remove("open");
  }

  function renderStats(stats) {
    const cards = [
      ["Total users", stats.total, "All registered accounts", ""],
      ["Online now", stats.online, "Active within 5 minutes", "online"],
      ["Verified", stats.verified, `${stats.unverified} awaiting verification`, ""],
      ["Needs attention", stats.suspended + stats.banned, `${stats.suspended} suspended · ${stats.banned} banned`, ""]
    ];
    $("#statsGrid").innerHTML = cards.map(([label, value, note, cls]) => `<article class="stat-card"><p class="stat-label">${esc(label)}</p><p class="stat-value ${cls}">${esc(value)}</p><p class="stat-note">${esc(note)}</p></article>`).join("");
  }

  function renderRecent() {
    const recent = [...users].sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0)).slice(0, 6);
    $("#recentUsers").innerHTML = recent.length ? recent.map((u) => `<div class="recent-row"><div class="avatar">${esc(initials(u))}</div><div class="recent-meta"><div class="recent-name">${esc(u.fullName || `${u.firstName} ${u.lastName}`)}</div><div class="recent-email">${esc(u.email)}</div></div><span class="presence ${u.online ? "live" : ""}">${u.online ? "Online" : `Seen ${esc(date(u.lastSeen))}`}</span></div>`).join("") : `<p class="subcopy">No users yet.</p>`;
  }

  function renderUsers() {
    const query = ($( "#userSearch").value || "").trim().toLowerCase();
    const filtered = users.filter((u) => `${u.fullName} ${u.email} ${u.username || ""}`.toLowerCase().includes(query));
    $("#usersEmpty").hidden = filtered.length > 0;
    $("#usersBody").innerHTML = filtered.map((u) => {
      const state = u.banned ? `<span class="status-chip banned">Banned</span>` : u.suspended ? `<span class="status-chip suspended">Suspended</span>` : u.online ? `<span class="status-chip live">Online</span>` : `<span class="status-chip offline">Offline</span>`;
      return `<tr><td><div class="user-cell"><div class="avatar">${esc(initials(u))}</div><div><div class="user-title">${esc(u.fullName || `${u.firstName} ${u.lastName}`)}</div><div class="user-sub">${esc(u.email)}${u.username ? ` · @${esc(u.username)}` : ""}</div></div></div></td><td>${state}</td><td>${u.isVerified ? '<span class="status-chip verified">Verified</span>' : '<span class="status-chip unverified">Pending</span>'}</td><td>${esc(u.role || "user")}</td><td>${esc(date(u.createdAt))}</td><td><div class="row-actions"><button class="icon-button" data-edit="${esc(u.id)}">Edit</button><button class="icon-button" data-suspend="${esc(u.id)}">${u.suspended ? "Restore" : "Suspend"}</button><button class="icon-button danger" data-delete="${esc(u.id)}">Delete</button></div></td></tr>`;
    }).join("");
  }

  async function loadData() {
    $("#statsGrid").classList.add("loading");
    try {
      const [overview, userData, me] = await Promise.all([api("/api/admin/overview"), api("/api/admin/users"), api("/api/auth/me")]);
      users = userData.users || [];
      renderStats(overview.stats || {}); renderRecent(); renderUsers();
      $("#adminEmail").textContent = me.user?.email || "Admin";
    } catch (error) {
      showToast(error.message);
      if (/admin|forbidden|token|auth/i.test(error.message)) setTimeout(() => location.replace("app.html"), 1200);
    } finally { $("#statsGrid").classList.remove("loading"); }
  }

  function openEdit(user) {
    activeUser = user; $("#modalBackdrop").hidden = false; $("#formMessage").textContent = "";
    $("#modalTitle").textContent = `Edit ${user.fullName || "user"}`; $("#editId").value = user.id; $("#editFirstName").value = user.firstName || ""; $("#editLastName").value = user.lastName || ""; $("#editEmail").value = user.email || ""; $("#editPhone").value = user.phone || ""; $("#editUsername").value = user.username || ""; $("#editRole").value = user.role || "user"; $("#editBio").value = user.bio || ""; $("#editSuspended").checked = Boolean(user.suspended); $("#editReason").value = user.suspensionReason || "";
  }
  function closeEdit() { $("#modalBackdrop").hidden = true; activeUser = null; }
  async function saveEdit(event) { event.preventDefault(); if (!activeUser) return; const message = $("#formMessage"); message.textContent = "Saving…"; try { await api(`/api/admin/users/${encodeURIComponent(activeUser.id)}`, { method: "PATCH", body: JSON.stringify({ firstName: $("#editFirstName").value, lastName: $("#editLastName").value, email: $("#editEmail").value, phone: $("#editPhone").value, username: $("#editUsername").value, role: $("#editRole").value, bio: $("#editBio").value, suspended: $("#editSuspended").checked, suspensionReason: $("#editReason").value }) }); closeEdit(); showToast("User updated"); await loadData(); } catch (error) { message.textContent = error.message; } }
  async function toggleSuspend(user) { try { await api(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ suspended: !user.suspended, suspensionReason: user.suspended ? "" : "Suspended by an administrator" }) }); showToast(user.suspended ? "Account restored" : "Account suspended"); await loadData(); } catch (error) { showToast(error.message); } }
  async function deleteUser(user) { if (user.role === "admin" && !confirm(`Delete admin ${user.email}?`)) return; if (!confirm(`Permanently delete ${user.email}? This cannot be undone.`)) return; try { await api(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE" }); showToast("Account deleted"); await loadData(); } catch (error) { showToast(error.message); } }

  document.addEventListener("click", (event) => { const view = event.target.closest("[data-view]"); if (view && view.dataset.view) { event.preventDefault(); setView(view.dataset.view); } const edit = event.target.closest("[data-edit]"); if (edit) openEdit(users.find((u) => String(u.id) === edit.dataset.edit)); const suspend = event.target.closest("[data-suspend]"); if (suspend) toggleSuspend(users.find((u) => String(u.id) === suspend.dataset.suspend)); const del = event.target.closest("[data-delete]"); if (del) deleteUser(users.find((u) => String(u.id) === del.dataset.delete)); });
  $("#userSearch").addEventListener("input", renderUsers); $("#refreshBtn").addEventListener("click", loadData); $("#usersRefresh").addEventListener("click", loadData); $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open")); $("#logoutBtn").addEventListener("click", () => { localStorage.removeItem("kyro.token"); localStorage.removeItem("kyro_token"); localStorage.removeItem("kyro.user"); localStorage.removeItem("kyro_user"); location.replace("login.html"); }); $("#modalClose").addEventListener("click", closeEdit); $("#cancelEdit").addEventListener("click", closeEdit); $("#userForm").addEventListener("submit", saveEdit); $("#modalBackdrop").addEventListener("click", (event) => { if (event.target.id === "modalBackdrop") closeEdit(); });
  loadData(); setInterval(loadData, 30000);
})();
