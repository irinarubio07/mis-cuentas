"use strict";
/* ============================================================
   Mis Cuentas (versión nube) — Supabase + GitHub Pages
   Los datos se guardan en tu base de datos de Supabase y se
   sincronizan entre todos los dispositivos donde inicies sesión.
   ============================================================ */

/* ---------- estado en memoria ---------- */
const state = {
  user: null,
  tx: [],                                   // movimientos del usuario
  cats: { income: [], expense: [] },        // categorías del usuario
  currency: localStorage.getItem("mc_currency") || "EUR",  // preferencia local
};
let sb = null;          // cliente de Supabase
let authMode = "signin"; // signin | signup

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const el = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };

function fmt(n) {
  try { return new Intl.NumberFormat("es-ES", { style: "currency", currency: state.currency, minimumFractionDigits: 2 }).format(n); }
  catch (e) { return Number(n).toFixed(2) + " " + state.currency; }
}
function curSymbol() { return ({ EUR: "€", USD: "$", GBP: "£", MXN: "$" })[state.currency] || "€"; }
function fmtDate(iso) { return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }); }
function monthKey(iso) { return String(iso).slice(0, 7); }
function monthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function catIcon(type, name) { const c = state.cats[type].find(x => x.name === name); return c ? c.icon : (type === "income" ? "➕" : "📦"); }

let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

const DEFAULT_CATS = {
  expense: [
    { name: "Comida", icon: "🍽️" }, { name: "Transporte", icon: "🚌" },
    { name: "Vivienda", icon: "🏠" }, { name: "Facturas", icon: "📄" },
    { name: "Ocio", icon: "🎬" }, { name: "Compras", icon: "🛍️" },
    { name: "Salud", icon: "💊" }, { name: "Otros", icon: "📦" },
  ],
  income: [
    { name: "Salario", icon: "💼" }, { name: "Freelance", icon: "💻" },
    { name: "Inversiones", icon: "📈" }, { name: "Regalos", icon: "🎁" }, { name: "Otros", icon: "➕" },
  ],
};

/* ============================================================
   ARRANQUE + CONFIGURACIÓN
   ============================================================ */
function configOk() {
  const c = window.SUPABASE_CONFIG || {};
  return c.url && c.key && !/TU_/.test(c.url) && !/TU_/.test(c.key);
}
function showOnly(id) {
  ["#splash", "#config-screen", "#auth-screen", "#app"].forEach(s => $(s).classList.toggle("hidden", s !== id));
}

async function boot() {
  if (!configOk()) { showOnly("#config-screen"); return; }
  try {
    sb = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);
  } catch (e) {
    showOnly("#config-screen"); return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (session) { await onLogin(session.user); }
  else { setupAuthScreen(); showOnly("#auth-screen"); }

  sb.auth.onAuthStateChange((_event, session) => {
    if (session && !state.user) { onLogin(session.user); }
    else if (!session && state.user) { onLogout(); }
  });
}

/* ============================================================
   PANTALLA DE ACCESO
   ============================================================ */
function setupAuthScreen() {
  const signin = authMode === "signin";
  $("#auth-title").textContent = signin ? "Inicia sesión" : "Crea tu cuenta";
  $("#auth-sub").textContent = signin
    ? "Entra para ver tus cuentas en cualquier ordenador."
    : "Regístrate una vez; luego entra desde donde quieras.";
  $("#auth-btn").textContent = signin ? "Entrar" : "Crear cuenta";
  $("#password").setAttribute("autocomplete", signin ? "current-password" : "new-password");
  $("#auth-switch").innerHTML = signin
    ? `¿No tienes cuenta? <a id="to-signup">Crea una</a>`
    : `¿Ya tienes cuenta? <a id="to-signin">Inicia sesión</a>`;
  const other = signin ? "#to-signup" : "#to-signin";
  $(other).addEventListener("click", () => { authMode = signin ? "signup" : "signin"; $("#auth-msg").textContent = ""; setupAuthScreen(); });
}

$("#auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#auth-msg"); msg.className = "msg";
  const email = $("#email").value.trim();
  const password = $("#password").value;
  const btn = $("#auth-btn");
  if (!email || password.length < 6) { msg.textContent = "Introduce tu correo y una contraseña de al menos 6 caracteres."; msg.className = "msg err"; return; }
  btn.disabled = true; btn.textContent = "Un momento…";
  try {
    if (authMode === "signup") {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) {
        msg.textContent = "Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.";
        msg.className = "msg ok";
        authMode = "signin"; setupAuthScreen();
      }
      // Si hay sesión (confirmación desactivada), onAuthStateChange se encarga de entrar.
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    msg.textContent = traducirError(err.message);
    msg.className = "msg err";
  } finally {
    btn.disabled = false;
    setupAuthScreen();
  }
});

function traducirError(m) {
  m = (m || "").toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("already registered")) return "Ese correo ya está registrado. Inicia sesión.";
  if (m.includes("email not confirmed")) return "Confirma tu correo antes de entrar (revisa tu bandeja).";
  if (m.includes("network") || m.includes("fetch")) return "Sin conexión con el servidor. Revisa tu internet.";
  return "No se ha podido completar. " + (m ? "(" + m + ")" : "");
}

$("#logout-btn").addEventListener("click", async () => {
  await sb.auth.signOut();
});

async function onLogout() {
  state.user = null; state.tx = []; state.cats = { income: [], expense: [] };
  authMode = "signin"; setupAuthScreen(); showOnly("#auth-screen");
  $("#password").value = "";
}

/* ============================================================
   CARGA DE DATOS TRAS LOGIN
   ============================================================ */
async function onLogin(user) {
  state.user = user;
  showOnly("#app");
  $("#view-panel").innerHTML = `<div class="spinner"></div>`;
  await loadAll();
  switchView("panel");
}

async function loadAll() {
  try {
    const [txRes, catRes] = await Promise.all([
      sb.from("transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      sb.from("categories").select("*"),
    ]);
    if (txRes.error) throw txRes.error;
    if (catRes.error) throw catRes.error;
    state.tx = txRes.data || [];
    let cats = catRes.data || [];
    if (cats.length === 0) { await seedCategories(); return loadAll(); }
    state.cats = { income: [], expense: [] };
    cats.forEach(c => state.cats[c.type] && state.cats[c.type].push({ id: c.id, name: c.name, icon: c.icon }));
  } catch (err) {
    toast("Error al cargar los datos");
    console.error(err);
  }
}

async function seedCategories() {
  const rows = [];
  ["income", "expense"].forEach(type =>
    DEFAULT_CATS[type].forEach(c => rows.push({ user_id: state.user.id, type, name: c.name, icon: c.icon }))
  );
  const { error } = await sb.from("categories").insert(rows);
  if (error) console.error(error);
}

/* ============================================================
   NAVEGACIÓN
   ============================================================ */
const VIEW_TITLES = { panel: "Panel", list: "Movimientos", add: "Nuevo movimiento", settings: "Ajustes" };
let currentView = "panel";

function switchView(v) {
  currentView = v;
  ["panel", "add", "list", "settings"].forEach(n => $("#view-" + n).classList.toggle("hidden", n !== v));
  document.querySelectorAll("nav.tabbar button").forEach(b =>
    b.classList.toggle("on", b.dataset.view === v && !b.classList.contains("add")));
  $("#appbar-title").textContent = VIEW_TITLES[v];
  if (v === "panel") renderPanel();
  if (v === "add") renderAdd();
  if (v === "list") renderList();
  if (v === "settings") renderSettings();
  window.scrollTo(0, 0);
}
document.querySelectorAll("nav.tabbar button").forEach(b =>
  b.addEventListener("click", () => switchView(b.dataset.view)));

/* ============================================================
   VISTA: PANEL
   ============================================================ */
function renderPanel() {
  const tx = state.tx;
  const nowKey = monthKey(todayISO());
  const balance = tx.reduce((s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);
  const mTx = tx.filter(t => monthKey(t.date) === nowKey);
  const mIn = mTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const mOut = mTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const v = $("#view-panel"); v.innerHTML = "";
  const hero = el("div", "card balance-card");
  hero.innerHTML = `<div class="lbl">Saldo total</div><div class="amount num">${fmt(balance)}</div><div class="month">${cap(monthLabel(nowKey))}</div>`;
  v.appendChild(hero);

  const split = el("div", "split");
  split.innerHTML = `
    <div class="stat"><div class="k"><span class="dot in"></span>Ingresos del mes</div><div class="v in num">${fmt(mIn)}</div></div>
    <div class="stat"><div class="k"><span class="dot out"></span>Gastos del mes</div><div class="v out num">${fmt(mOut)}</div></div>`;
  v.appendChild(split);

  v.appendChild(buildTrendCard(tx));
  v.appendChild(buildCategoryCard(mTx));

  const recentCard = el("div", "card");
  recentCard.innerHTML = `<h2>Últimos movimientos</h2>`;
  const recent = tx.slice(0, 6);
  if (recent.length === 0) recentCard.appendChild(emptyState("Aún no hay movimientos", "Pulsa el botón + para añadir tu primer ingreso o gasto."));
  else recentCard.appendChild(txListEl(recent, false));
  v.appendChild(recentCard);
}

function buildTrendCard(tx) {
  const card = el("div", "card");
  card.innerHTML = `<h2>Últimos 6 meses</h2>`;
  const months = [];
  const d = new Date(); d.setDate(1);
  for (let i = 5; i >= 0; i--) months.push(new Date(d.getFullYear(), d.getMonth() - i, 1).toISOString().slice(0, 7));
  const data = months.map(k => {
    const mt = tx.filter(t => monthKey(t.date) === k);
    return {
      key: k,
      in: mt.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      out: mt.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    };
  });
  const max = Math.max(1, ...data.map(m => Math.max(m.in, m.out)));
  const W = 340, H = 150, pad = 22;
  const groupW = (W - pad * 2) / months.length, barW = (groupW - 14) / 2;
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Ingresos y gastos de los últimos seis meses">`;
  data.forEach((m, i) => {
    const x0 = pad + i * groupW;
    const hIn = (m.in / max) * (H - 40), hOut = (m.out / max) * (H - 40);
    svg += `<rect x="${x0 + 2}" y="${H - 24 - hIn}" width="${barW}" height="${Math.max(0, hIn)}" rx="3" style="fill:var(--income)"/>`;
    svg += `<rect x="${x0 + 2 + barW + 2}" y="${H - 24 - hOut}" width="${barW}" height="${Math.max(0, hOut)}" rx="3" style="fill:var(--expense)"/>`;
    const lbl = new Date(m.key + "-01T00:00:00").toLocaleDateString("es-ES", { month: "short" });
    svg += `<text x="${x0 + groupW / 2}" y="${H - 8}" text-anchor="middle" font-size="10" style="fill:var(--muted);font-family:var(--sans)">${lbl}</text>`;
  });
  svg += `</svg>`;
  card.insertAdjacentHTML("beforeend", svg);
  card.insertAdjacentHTML("beforeend", `<div class="chart-legend"><span><span class="dot in"></span>Ingresos</span><span><span class="dot out"></span>Gastos</span></div>`);
  return card;
}

function buildCategoryCard(mTx) {
  const card = el("div", "card");
  card.innerHTML = `<h2>Gastos por categoría · este mes</h2>`;
  const expenses = mTx.filter(t => t.type === "expense");
  if (expenses.length === 0) { card.appendChild(emptyState("Sin gastos este mes", "Cuando registres gastos, aquí verás en qué se va tu dinero.")); return card; }
  const byCat = {};
  expenses.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount); });
  const total = Object.values(byCat).reduce((a, b) => a + b, 0);
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([catName, val]) => {
    const row = el("div", "catrow");
    row.innerHTML = `
      <div class="cat-ic">${catIcon("expense", catName)}</div>
      <div class="cat-meta">
        <div class="cat-top"><span class="cat-name">${escapeHtml(catName)}</span><span class="cat-val num">${fmt(val)}</span></div>
        <div class="bar"><i style="width:${Math.round((val / total) * 100)}%"></i></div>
      </div>`;
    card.appendChild(row);
  });
  return card;
}

/* ============================================================
   VISTA: AÑADIR
   ============================================================ */
let addType = "expense";
function renderAdd() {
  const v = $("#view-add");
  v.innerHTML = `
    <h1 class="view-title">Nuevo movimiento</h1>
    <p class="view-sub">Registra un ingreso o un gasto.</p>
    <div class="toggle" id="type-toggle">
      <button type="button" data-t="expense">Gasto</button>
      <button type="button" data-t="income">Ingreso</button>
    </div>
    <div class="amount-input">
      <input id="f-amount" inputmode="decimal" placeholder="0" />
      <span class="cur">${curSymbol()}</span>
    </div>
    <div class="field"><label for="f-cat">Categoría</label><select id="f-cat"></select></div>
    <div class="grid2">
      <div class="field"><label for="f-date">Fecha</label><input id="f-date" type="date" value="${todayISO()}" /></div>
      <div class="field"><label for="f-note">Nota (opcional)</label><input id="f-note" type="text" placeholder="Ej. Cena" /></div>
    </div>
    <button class="btn" id="f-save" style="margin-top:8px">Guardar movimiento</button>`;
  const fillCats = () => {
    $("#f-cat", v).innerHTML = state.cats[addType].map(c => `<option value="${escapeHtml(c.name)}">${c.icon} ${escapeHtml(c.name)}</option>`).join("");
  };
  const setType = (t) => {
    addType = t;
    v.querySelectorAll("#type-toggle button").forEach(b => b.classList.toggle("on", b.dataset.t === t));
    fillCats();
  };
  v.querySelectorAll("#type-toggle button").forEach(b => b.addEventListener("click", () => setType(b.dataset.t)));
  setType(addType);

  $("#f-save", v).addEventListener("click", async () => {
    const amount = parseFloat($("#f-amount", v).value.replace(",", ".").trim());
    if (!amount || amount <= 0) { toast("Introduce un importe válido"); $("#f-amount", v).focus(); return; }
    const btn = $("#f-save", v); btn.disabled = true; btn.textContent = "Guardando…";
    const row = {
      user_id: state.user.id,
      type: addType,
      amount: Math.round(amount * 100) / 100,
      category: $("#f-cat", v).value,
      date: $("#f-date", v).value || todayISO(),
      note: $("#f-note", v).value.trim(),
    };
    const { data, error } = await sb.from("transactions").insert(row).select().single();
    if (error) { toast("No se pudo guardar"); btn.disabled = false; btn.textContent = "Guardar movimiento"; return; }
    state.tx.unshift(data);
    state.tx.sort((a, b) => b.date.localeCompare(a.date) || String(b.created_at).localeCompare(String(a.created_at)));
    toast(addType === "income" ? "Ingreso guardado ✓" : "Gasto guardado ✓");
    switchView("panel");
  });
}

/* ============================================================
   VISTA: MOVIMIENTOS
   ============================================================ */
let listFilter = "all";
function renderList() {
  const v = $("#view-list");
  const tx = state.tx;
  v.innerHTML = `
    <h1 class="view-title">Movimientos</h1>
    <p class="view-sub">${tx.length} ${tx.length === 1 ? "registro" : "registros"} en total.</p>
    <div class="chips" id="list-filters">
      <button class="chip ${listFilter === "all" ? "on" : ""}" data-f="all">Todos</button>
      <button class="chip ${listFilter === "income" ? "on" : ""}" data-f="income">Ingresos</button>
      <button class="chip ${listFilter === "expense" ? "on" : ""}" data-f="expense">Gastos</button>
    </div>
    <div id="list-body"></div>`;
  v.querySelectorAll("#list-filters .chip").forEach(c => c.addEventListener("click", () => { listFilter = c.dataset.f; renderList(); }));
  const filtered = tx.filter(t => listFilter === "all" || t.type === listFilter);
  const body = $("#list-body", v);
  if (filtered.length === 0) { body.appendChild(emptyState("Nada por aquí", "No hay movimientos con este filtro.")); return; }
  const groups = {};
  filtered.forEach(t => { (groups[monthKey(t.date)] = groups[monthKey(t.date)] || []).push(t); });
  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(k => {
    const card = el("div", "card");
    const inSum = groups[k].filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const outSum = groups[k].filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    card.innerHTML = `<h2>${cap(monthLabel(k))} · <span style="color:var(--income)">${fmt(inSum)}</span> / <span style="color:var(--expense)">${fmt(outSum)}</span></h2>`;
    card.appendChild(txListEl(groups[k], true));
    body.appendChild(card);
  });
}

/* ============================================================
   VISTA: AJUSTES
   ============================================================ */
function renderSettings() {
  const v = $("#view-settings");
  v.innerHTML = `
    <h1 class="view-title">Ajustes</h1>
    <p class="view-sub">Sesión: ${escapeHtml(state.user.email || "")}</p>

    <div class="card">
      <h2>General</h2>
      <div class="set-row">
        <div><div class="st">Moneda</div><div class="sd">Cómo se muestran los importes (preferencia de este dispositivo).</div></div>
        <select id="set-currency" style="width:auto;min-width:110px">
          <option value="EUR" ${state.currency === "EUR" ? "selected" : ""}>€ Euro</option>
          <option value="USD" ${state.currency === "USD" ? "selected" : ""}>$ Dólar</option>
          <option value="GBP" ${state.currency === "GBP" ? "selected" : ""}>£ Libra</option>
          <option value="MXN" ${state.currency === "MXN" ? "selected" : ""}>$ Peso MXN</option>
        </select>
      </div>
    </div>

    <div class="card"><h2>Categorías de gasto</h2><div class="taglist" id="cats-expense"></div>
      <div class="addcat"><input id="new-cat-expense" placeholder="Nueva categoría…" maxlength="20"/><button data-type="expense">Añadir</button></div></div>
    <div class="card"><h2>Categorías de ingreso</h2><div class="taglist" id="cats-income"></div>
      <div class="addcat"><input id="new-cat-income" placeholder="Nueva categoría…" maxlength="20"/><button data-type="income">Añadir</button></div></div>

    <div class="card">
      <h2>Copia de seguridad</h2>
      <div class="set-row"><div><div class="st">Exportar datos</div><div class="sd">Descarga un archivo con todos tus movimientos.</div></div>
        <button class="btn ghost" id="btn-export" style="width:auto;padding:10px 16px">Exportar</button></div>
      <div class="set-row"><div><div class="st">Importar datos</div><div class="sd">Añade movimientos desde un archivo exportado.</div></div>
        <button class="btn ghost" id="btn-import" style="width:auto;padding:10px 16px">Importar</button></div>
      <input type="file" id="file-import" accept="application/json" class="hidden"/>
    </div>

    <div class="card"><h2>Seguridad</h2>
      <div class="set-row"><div><div class="st">Cambiar contraseña</div><div class="sd">Actualiza tu contraseña de acceso.</div></div>
        <button class="btn ghost" id="btn-pw" style="width:auto;padding:10px 16px">Cambiar</button></div>
    </div>

    <p style="text-align:center;color:var(--muted);font-size:12px;margin-top:6px">Mis Cuentas · datos sincronizados con Supabase</p>`;

  $("#set-currency", v).addEventListener("change", e => {
    state.currency = e.target.value; localStorage.setItem("mc_currency", state.currency); toast("Moneda actualizada");
  });

  const renderTags = () => {
    ["expense", "income"].forEach(type => {
      const box = $("#cats-" + type, v); box.innerHTML = "";
      state.cats[type].forEach(cat => {
        const tag = el("span", "tag");
        tag.innerHTML = `${cat.icon} ${escapeHtml(cat.name)} <button title="Eliminar" aria-label="Eliminar ${escapeHtml(cat.name)}">×</button>`;
        tag.querySelector("button").addEventListener("click", async () => {
          if (state.cats[type].length <= 1) { toast("Debe quedar al menos una categoría"); return; }
          const { error } = await sb.from("categories").delete().eq("id", cat.id);
          if (error) { toast("No se pudo eliminar"); return; }
          state.cats[type] = state.cats[type].filter(x => x.id !== cat.id); renderTags();
        });
        box.appendChild(tag);
      });
    });
  };
  renderTags();

  v.querySelectorAll(".addcat button").forEach(btn => btn.addEventListener("click", async () => {
    const type = btn.dataset.type, inp = $("#new-cat-" + type, v), name = inp.value.trim();
    if (!name) return;
    if (state.cats[type].some(x => x.name.toLowerCase() === name.toLowerCase())) { toast("Ya existe esa categoría"); return; }
    const row = { user_id: state.user.id, type, name, icon: type === "income" ? "➕" : "🏷️" };
    const { data, error } = await sb.from("categories").insert(row).select().single();
    if (error) { toast("No se pudo añadir"); return; }
    state.cats[type].push({ id: data.id, name: data.name, icon: data.icon });
    inp.value = ""; renderTags(); toast("Categoría añadida");
  }));

  $("#btn-export", v).addEventListener("click", exportData);
  $("#btn-import", v).addEventListener("click", () => $("#file-import", v).click());
  $("#file-import", v).addEventListener("change", importData);
  $("#btn-pw", v).addEventListener("click", changePassword);
}

async function changePassword() {
  const nw = prompt("Nueva contraseña (mín. 6 caracteres):");
  if (nw === null) return;
  if (nw.length < 6) { toast("Demasiado corta"); return; }
  const { error } = await sb.auth.updateUser({ password: nw });
  toast(error ? "No se pudo cambiar" : "Contraseña actualizada ✓");
}

function exportData() {
  const payload = { app: "mis-cuentas", version: 2, exported: new Date().toISOString(), transactions: state.tx };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = el("a"); a.href = url; a.download = `mis-cuentas-${todayISO()}.json`; a.click();
  URL.revokeObjectURL(url); toast("Datos exportados ✓");
}

async function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const d = JSON.parse(reader.result);
      if (!Array.isArray(d.transactions)) throw new Error("formato");
      if (!confirm(`Se añadirán ${d.transactions.length} movimientos a tu cuenta. ¿Continuar?`)) return;
      const rows = d.transactions.map(t => ({
        user_id: state.user.id, type: t.type, amount: t.amount,
        category: t.category, date: t.date, note: t.note || "",
      }));
      const { error } = await sb.from("transactions").insert(rows);
      if (error) throw error;
      toast("Datos importados ✓");
      await loadAll(); switchView("panel");
    } catch (err) { toast("Archivo no válido"); }
  };
  reader.readAsText(file); e.target.value = "";
}

/* ============================================================
   COMPONENTES
   ============================================================ */
function txListEl(list, withDelete) {
  const wrap = el("div", "txlist");
  list.forEach(t => {
    const row = el("div", "tx");
    const io = t.type === "income" ? "in" : "out";
    const sign = t.type === "income" ? "+" : "−";
    row.innerHTML = `
      <div class="tx-ic ${io}">${catIcon(t.type, t.category)}</div>
      <div class="tx-meta"><div class="tx-cat">${escapeHtml(t.category)}</div>
        <div class="tx-sub">${fmtDate(t.date)}${t.note ? " · " + escapeHtml(t.note) : ""}</div></div>
      <div class="tx-amt ${io} num">${sign}${fmt(t.amount).replace(/^[-+−]?/, "")}</div>`;
    if (withDelete) {
      const del = el("button", "tx-del");
      del.setAttribute("aria-label", "Eliminar movimiento");
      del.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      del.addEventListener("click", async () => {
        if (!confirm("¿Eliminar este movimiento?")) return;
        const { error } = await sb.from("transactions").delete().eq("id", t.id);
        if (error) { toast("No se pudo eliminar"); return; }
        state.tx = state.tx.filter(x => x.id !== t.id);
        toast("Movimiento eliminado"); switchView(currentView);
      });
      row.appendChild(del);
    }
    wrap.appendChild(row);
  });
  return wrap;
}

function emptyState(title, text) {
  const e = el("div", "empty");
  e.innerHTML = `<div class="big">🪙</div><p><strong>${title}</strong><br>${text}</p>`;
  return e;
}

/* ============================================================
   INICIO + SERVICE WORKER
   ============================================================ */
boot();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
