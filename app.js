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
  goals: [],                                // metas de ahorro del usuario
  fixedExp: [],                             // gastos fijos recurrentes (recibos mensuales)
  currency: localStorage.getItem("mc_currency") || "EUR",  // preferencia local
};
let sb = null;          // cliente de Supabase
let authMode = "signin"; // signin | signup | recover-request | recover-verify

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
function txMethod(t) { return t.method === "tarjeta" ? "tarjeta" : "efectivo"; }   // por defecto: efectivo

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
  const isRecovery = location.hash.includes("type=recovery");

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      authMode = "recover-verify"; setupAuthScreen(); showOnly("#auth-screen");
      return;
    }
    if (session && !state.user) { onLogin(session.user); }
    else if (!session && state.user) { onLogout(); }
  });

  if (isRecovery) {
    // Llegó por el enlace de recuperación: mostrar el formulario de nueva contraseña.
    authMode = "recover-verify"; setupAuthScreen(); showOnly("#auth-screen");
    return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (session) { await onLogin(session.user); }
  else { setupAuthScreen(); showOnly("#auth-screen"); }
}

/* ============================================================
   PANTALLA DE ACCESO
   ============================================================ */
function goMode(m) { authMode = m; $("#auth-msg").textContent = ""; setupAuthScreen(); }
function setupAuthScreen() {
  const mode = authMode;
  const titles = { signin: "Inicia sesión", signup: "Crea tu cuenta", "recover-request": "Recuperar contraseña", "recover-verify": "Nueva contraseña" };
  const subs = {
    signin: "Entra para ver tus cuentas en cualquier ordenador.",
    signup: "Regístrate una vez; luego entra desde donde quieras.",
    "recover-request": "Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.",
    "recover-verify": "Escribe tu nueva contraseña.",
  };
  const btns = { signin: "Entrar", signup: "Crear cuenta", "recover-request": "Enviar enlace", "recover-verify": "Guardar contraseña" };
  $("#auth-title").textContent = titles[mode];
  $("#auth-sub").textContent = subs[mode];
  $("#auth-btn").textContent = btns[mode];
  // Campos visibles según el paso
  $("#email-field").classList.toggle("hidden", mode === "recover-verify");
  $("#code-field").classList.add("hidden");   // ya no se usa código (flujo por enlace)
  $("#password-field").classList.toggle("hidden", mode === "recover-request");
  $("#password-label").textContent = mode === "recover-verify" ? "Nueva contraseña" : "Contraseña";
  $("#password").setAttribute("autocomplete", mode === "signin" ? "current-password" : "new-password");
  // Enlace "¿Has olvidado tu contraseña?" (solo al iniciar sesión, debajo del recuadro de contraseña)
  $("#forgot").innerHTML = mode === "signin"
    ? `<a id="to-recover" style="color:var(--on-pine);font-weight:600;cursor:pointer;text-decoration:none">¿Has olvidado tu contraseña?</a>`
    : "";
  const rec = $("#to-recover"); if (rec) rec.addEventListener("click", () => goMode("recover-request"));
  // Enlace de abajo
  $("#auth-switch").innerHTML =
    mode === "signin" ? `¿No tienes cuenta? <a id="to-signup">Crea una</a>` :
    mode === "signup" ? `¿Ya tienes cuenta? <a id="to-signin">Inicia sesión</a>` :
    `<a id="to-signin">Volver a iniciar sesión</a>`;
  const su = $("#to-signup"); if (su) su.addEventListener("click", () => goMode("signup"));
  const si = $("#to-signin"); if (si) si.addEventListener("click", () => goMode("signin"));
}

$("#auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#auth-msg"); msg.className = "msg";
  const email = $("#email").value.trim();
  const password = $("#password").value;
  const btn = $("#auth-btn");
  const mode = authMode;
  try {
    if (mode === "signin" || mode === "signup") {
      if (!email || password.length < 6) { msg.textContent = "Introduce tu correo y una contraseña de al menos 6 caracteres."; msg.className = "msg err"; return; }
      btn.disabled = true; btn.textContent = "Un momento…";
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          msg.textContent = "Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.";
          msg.className = "msg ok";
          authMode = "signin";
        }
        // Si hay sesión (confirmación desactivada), onAuthStateChange se encarga de entrar.
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } else if (mode === "recover-request") {
      if (!email) { msg.textContent = "Escribe tu correo."; msg.className = "msg err"; return; }
      btn.disabled = true; btn.textContent = "Enviando…";
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw error;
      msg.textContent = "Te hemos enviado un correo a " + email + ". Ábrelo y pulsa el enlace para crear tu contraseña nueva (revisa también spam).";
      msg.className = "msg ok";
    } else if (mode === "recover-verify") {
      if (password.length < 6) { msg.textContent = "La nueva contraseña debe tener al menos 6 caracteres."; msg.className = "msg err"; return; }
      btn.disabled = true; btn.textContent = "Guardando…";
      const { data, error: uErr } = await sb.auth.updateUser({ password });
      if (uErr) throw uErr;
      // La sesión de recuperación ya existe (llegó por el enlace) → entramos con la nueva contraseña.
      if (data && data.user) onLogin(data.user);
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
  if (m.includes("expired") || m.includes("otp") || (m.includes("token") && m.includes("invalid"))) return "El código no es válido o ha caducado. Pide uno nuevo.";
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera un minuto e inténtalo de nuevo.";
  if (m.includes("network") || m.includes("fetch")) return "Sin conexión con el servidor. Revisa tu internet.";
  return "No se ha podido completar. " + (m ? "(" + m + ")" : "");
}

$("#logout-btn").addEventListener("click", async () => {
  await sb.auth.signOut();
});

async function onLogout() {
  state.user = null; state.tx = []; state.cats = { income: [], expense: [] }; state.goals = []; state.fixedExp = [];
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
  if (await loadAll()) switchView("panel");
  else showLoadError();
}

// Corre una promesa con tiempo límite: si tarda demasiado, rechaza (evita "cargando" infinito).
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// Devuelve true si cargó bien, false si falló. NUNCA se queda colgada.
async function loadAll(seeded) {
  try {
    const [txRes, catRes, goalsRes, feRes] = await withTimeout(Promise.all([
      sb.from("transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      sb.from("categories").select("*"),
      sb.from("goals").select("*").order("created_at", { ascending: true }),
      sb.from("fixed_expenses").select("*").order("created_at", { ascending: true }),
    ]), 15000);
    if (txRes.error) throw txRes.error;
    if (catRes.error) throw catRes.error;
    state.tx = txRes.data || [];
    // Tablas que pueden no existir aún (si no se ha ejecutado su SQL): si fallan, lista vacía.
    state.goals = goalsRes.error ? [] : (goalsRes.data || []);
    state.fixedExp = feRes.error ? [] : (feRes.data || []);
    let cats = catRes.data || [];
    // Sembrar las categorías por defecto SOLO una vez (evita bucle infinito si algo falla).
    if (cats.length === 0 && !seeded) { await seedCategories(); return loadAll(true); }
    state.cats = { income: [], expense: [] };
    cats.forEach(c => state.cats[c.type] && state.cats[c.type].push({ id: c.id, name: c.name, icon: c.icon }));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// Pantalla de "no se pudo cargar" con botón para reintentar (en vez de spinner eterno).
function showLoadError() {
  ["panel", "add", "list", "savings", "settings"].forEach(n => $("#view-" + n).classList.toggle("hidden", n !== "panel"));
  const v = $("#view-panel");
  v.innerHTML = "";
  const box = el("div", "empty");
  box.innerHTML = `<div class="big">📡</div><p><strong>No se pudieron cargar los datos</strong><br>Revisa tu conexión e inténtalo de nuevo.</p>`;
  const btn = el("button", "btn");
  btn.textContent = "Reintentar";
  btn.style.cssText = "max-width:220px;margin:18px auto 0;display:block";
  btn.addEventListener("click", async () => {
    v.innerHTML = `<div class="spinner"></div>`;
    if (await loadAll()) switchView("panel");
    else showLoadError();
  });
  v.appendChild(box);
  v.appendChild(btn);
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
let currentView = "panel";

function switchView(v) {
  currentView = v;
  ["panel", "add", "movs", "savings", "settings"].forEach(n => $("#view-" + n).classList.toggle("hidden", n !== v));
  document.querySelectorAll("nav.tabbar button").forEach(b =>
    b.classList.toggle("on", b.dataset.view === v && !b.classList.contains("add")));
  $("#settings-btn").classList.toggle("on", v === "settings");
  if (v === "panel") renderPanel();
  if (v === "add") renderAdd();
  if (v === "movs") renderMovs();
  if (v === "savings") renderSavings();
  if (v === "settings") renderSettings();
  window.scrollTo(0, 0);
}
document.querySelectorAll("nav.tabbar button").forEach(b =>
  b.addEventListener("click", () => switchView(b.dataset.view)));
$("#settings-btn").addEventListener("click", () => switchView("settings"));

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
let addMethod = "efectivo";
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
    <div class="field">
      <label>Método</label>
      <div class="chips" id="method-chips" style="margin-bottom:0">
        <button type="button" class="chip" data-m="efectivo">💵 Efectivo</button>
        <button type="button" class="chip" data-m="tarjeta">💳 Tarjeta</button>
      </div>
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

  const setMethod = (m) => {
    addMethod = m;
    v.querySelectorAll("#method-chips .chip").forEach(c => c.classList.toggle("on", c.dataset.m === m));
  };
  v.querySelectorAll("#method-chips .chip").forEach(c => c.addEventListener("click", () => setMethod(c.dataset.m)));
  setMethod(addMethod);

  $("#f-save", v).addEventListener("click", async () => {
    const amount = parseFloat($("#f-amount", v).value.replace(",", ".").trim());
    if (!amount || amount <= 0) { toast("Introduce un importe válido"); $("#f-amount", v).focus(); return; }
    const btn = $("#f-save", v); btn.disabled = true; btn.textContent = "Guardando…";
    const row = {
      user_id: state.user.id,
      type: addType,
      amount: Math.round(amount * 100) / 100,
      category: $("#f-cat", v).value,
      method: addMethod,
      date: $("#f-date", v).value || todayISO(),
      note: $("#f-note", v).value.trim(),
    };
    const { data, error } = await sb.from("transactions").insert(row).select().single();
    if (error) {
      const faltaColumna = /method|column|schema cache/i.test(error.message || "");
      toast(faltaColumna ? "Falta actualizar Supabase: ejecuta el SQL de la columna «method»." : "No se pudo guardar");
      btn.disabled = false; btn.textContent = "Guardar movimiento"; return;
    }
    state.tx.unshift(data);
    state.tx.sort((a, b) => b.date.localeCompare(a.date) || String(b.created_at).localeCompare(String(a.created_at)));
    toast(addType === "income" ? "Ingreso guardado ✓" : "Gasto guardado ✓");
    switchView("panel");
  });
}

/* ============================================================
   VISTA: MOVIMIENTOS
   ============================================================ */
let listMethod = "all";
let movsType = "income";   // pestaña seleccionada dentro de Movimientos (Ingresos/Gastos)
function renderMovs() {
  const v = $("#view-movs");
  const type = movsType;
  const color = type === "income" ? "var(--income)" : "var(--expense)";
  const sign = type === "income" ? "+" : "−";
  const all = state.tx.filter(t => t.type === type);
  v.innerHTML = `
    <h1 class="view-title">Movimientos</h1>
    <div class="toggle" id="movs-type">
      <button type="button" data-t="income">Ingresos</button>
      <button type="button" data-t="expense">Gastos</button>
    </div>
    <div class="chips" id="method-filters">
      <button class="chip ${listMethod === "all" ? "on" : ""}" data-m="all">Todo</button>
      <button class="chip ${listMethod === "efectivo" ? "on" : ""}" data-m="efectivo">💵 Efectivo</button>
      <button class="chip ${listMethod === "tarjeta" ? "on" : ""}" data-m="tarjeta">💳 Tarjeta</button>
    </div>
    <div id="movs-summary"></div>
    <div id="movs-body"></div>`;
  v.querySelectorAll("#movs-type button").forEach(b => {
    b.classList.toggle("on", b.dataset.t === type);
    b.addEventListener("click", () => { movsType = b.dataset.t; renderMovs(); });
  });
  v.querySelectorAll("#method-filters .chip").forEach(c => c.addEventListener("click", () => { listMethod = c.dataset.m; renderMovs(); }));

  const filtered = all.filter(t => listMethod === "all" || txMethod(t) === listMethod);

  // Resumen: total de este tipo con el método elegido.
  if (all.length) {
    const total = filtered.reduce((s, t) => s + Number(t.amount), 0);
    const methodLabel = listMethod === "efectivo" ? "💵 Efectivo" : listMethod === "tarjeta" ? "💳 Tarjeta" : "Todo";
    $("#movs-summary", v).innerHTML = `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Total · ${methodLabel}</div>
        <div class="num" style="font-size:22px;font-weight:600;color:${color}">${sign}${fmt(total).replace(/^[-+−]?/, "")}</div>
      </div>`;
  }

  const body = $("#movs-body", v);
  if (type === "expense") {
    // Apartado Gastos fijos: recibos recurrentes con su interruptor Pagado/Pendiente.
    renderFixedSection(body);
    // Apartado Gastos variables: gastos normales (sin gasto fijo asociado).
    const hv = el("div", "section-label"); hv.textContent = "Gastos variables"; body.appendChild(hv);
    const variables = filtered.filter(t => !t.fixed_expense_id);
    if (variables.length) renderMonthGroups(body, variables, color);
    else { const p = el("p"); p.style.cssText = "color:var(--muted);font-size:13px;margin:0 2px 10px"; p.textContent = "Nada aquí todavía."; body.appendChild(p); }
  } else {
    if (filtered.length === 0) { body.appendChild(emptyState("Nada por aquí", "No hay movimientos con este filtro.")); return; }
    renderMonthGroups(body, filtered, color);
  }
}

/* Apartado de gastos fijos: lista de recibos recurrentes con interruptor Pagado/Pendiente.
   Pagado = existe un gasto (transacción) enlazado este mes → baja del saldo total. */
function renderFixedSection(container) {
  const h = el("div", "section-label"); h.textContent = "Gastos fijos"; container.appendChild(h);

  const addBtn = el("button", "btn");
  addBtn.textContent = "＋ Nuevo gasto fijo";
  addBtn.style.cssText = "margin-bottom:12px";
  container.appendChild(addBtn);
  const form = el("div", "card hidden");
  form.innerHTML = `
    <div class="field"><label>Nombre</label><input class="fe-name" type="text" placeholder="Ej. Alquiler" /></div>
    <div class="field"><label>Importe (€/mes)</label><input class="fe-amount" inputmode="decimal" placeholder="Ej. 800" /></div>
    <button class="btn fe-create">Crear</button>`;
  container.appendChild(form);
  addBtn.addEventListener("click", () => form.classList.toggle("hidden"));
  form.querySelector(".fe-create").addEventListener("click", async () => {
    const name = form.querySelector(".fe-name").value.trim();
    const amount = Math.round(parseFloat((form.querySelector(".fe-amount").value || "").replace(",", ".")) * 100) / 100;
    if (!name) { toast("Ponle un nombre"); return; }
    if (!amount || amount <= 0) { toast("Importe no válido"); return; }
    const { data, error } = await sb.from("fixed_expenses").insert({ user_id: state.user.id, name, amount }).select().single();
    if (error) { toast(/fixed_expenses|relation|does not exist|schema cache/i.test(error.message || "") ? "Falta crear la tabla en Supabase: ejecuta el SQL de «fixed_expenses»." : "No se pudo crear"); return; }
    state.fixedExp.push(data);
    renderMovs();
  });

  if (state.fixedExp.length === 0) {
    const p = el("p"); p.style.cssText = "color:var(--muted);font-size:13px;margin:0 2px 12px";
    p.textContent = "Aún no hay gastos fijos. Crea uno (ej. Alquiler, Seguro…).";
    container.appendChild(p);
    return;
  }
  const nowKey = monthKey(todayISO());
  state.fixedExp.forEach(fe => {
    const payTx = state.tx.find(t => t.fixed_expense_id === fe.id && monthKey(t.date) === nowKey);
    const paid = !!payTx;
    const card = el("div", "card");
    card.innerHTML = `
      <div class="goal-top">
        <div class="goal-ic">📌</div>
        <div class="goal-name">${escapeHtml(fe.name)}</div>
        <div class="goal-saved num">${fmt(Number(fe.amount))}</div>
      </div>
      <div class="goal-actions">
        <button data-act="toggle" class="${paid ? "add" : ""}" style="flex:1">${paid ? "✓ Pagado" : "Marcar pagado"}</button>
        <button class="del" data-act="del" aria-label="Eliminar gasto fijo">🗑️</button>
      </div>`;
    card.querySelector('[data-act="toggle"]').addEventListener("click", async () => {
      if (paid) {
        const { error } = await sb.from("transactions").delete().eq("id", payTx.id);
        if (error) { toast("No se pudo actualizar"); return; }
        state.tx = state.tx.filter(t => t.id !== payTx.id);
      } else {
        const row = { user_id: state.user.id, type: "expense", amount: Number(fe.amount), category: fe.name, method: "tarjeta", fixed: true, fixed_expense_id: fe.id, date: todayISO() };
        const { data, error } = await sb.from("transactions").insert(row).select().single();
        if (error) { toast(/fixed_expense_id|column|schema cache/i.test(error.message || "") ? "Falta el SQL: ejecuta el de «fixed_expenses»." : "No se pudo guardar"); return; }
        state.tx.unshift(data);
      }
      renderMovs();
    });
    card.querySelector('[data-act="del"]').addEventListener("click", async () => {
      if (!confirm(`¿Eliminar el gasto fijo "${fe.name}"?`)) return;
      const { error } = await sb.from("fixed_expenses").delete().eq("id", fe.id);
      if (error) { toast("No se pudo eliminar"); return; }
      state.fixedExp = state.fixedExp.filter(x => x.id !== fe.id);
      renderMovs();
    });
    container.appendChild(card);
  });
}

function renderMonthGroups(container, list, color) {
  const groups = {};
  list.forEach(t => { (groups[monthKey(t.date)] = groups[monthKey(t.date)] || []).push(t); });
  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(k => {
    const card = el("div", "card");
    const sum = groups[k].reduce((s, t) => s + Number(t.amount), 0);
    card.innerHTML = `<h2>${cap(monthLabel(k))} · <span style="color:${color}">${fmt(sum)}</span></h2>`;
    card.appendChild(txListEl(groups[k], true));
    container.appendChild(card);
  });
}

/* ============================================================
   VISTA: AHORRO / METAS
   ============================================================ */
function askAmount(msg) {
  const raw = prompt(msg);
  if (raw == null) return null;
  const n = parseFloat(String(raw).replace(",", ".").trim());
  if (!n || n <= 0) { toast("Cantidad no válida"); return null; }
  return Math.round(n * 100) / 100;
}
function goalsTableMissing(error) {
  return /goals|relation|does not exist|schema cache/i.test((error && error.message) || "");
}

function renderSavings() {
  const v = $("#view-savings");
  const metas = state.goals.filter(g => g.target != null);
  const pot = state.goals.find(g => g.target == null);      // el "bote" de ahorro (único, sin objetivo)
  const ahorro = pot ? Number(pot.saved || 0) : 0;

  v.innerHTML = `
    <h1 class="view-title">Ahorro</h1>
    <p class="view-sub">Tu ahorro y tus metas, aparte del saldo.</p>

    <div class="section-label" style="margin-top:4px">Ahorro</div>
    <div class="card">
      <div class="goal-top">
        <div class="goal-ic">🏦</div>
        <div class="goal-name">Ahorro acumulado</div>
        <div class="goal-saved num">${fmt(ahorro)}</div>
      </div>
      <div class="goal-actions">
        <button class="add" id="ahorro-add">＋ Añadir</button>
        <button id="ahorro-sub">− Retirar</button>
      </div>
    </div>

    <div class="section-label">Metas</div>
    <button class="btn" id="new-goal-btn" style="margin-bottom:12px">＋ Nueva meta</button>
    <div class="card hidden" id="new-goal-form">
      <div class="field"><label for="g-name">Nombre</label><input id="g-name" type="text" placeholder="Ej. Viaje a Japón" /></div>
      <div class="field"><label for="g-target">Objetivo (€)</label><input id="g-target" inputmode="decimal" placeholder="Ej. 1200" /></div>
      <button class="btn" id="g-create">Crear meta</button>
    </div>
    <div id="metas-list"></div>`;

  // Ahorro: un único bote. Se puede añadir o retirar (p. ej. para una emergencia).
  const changeAhorro = async (sign) => {
    const amt = askAmount(sign > 0 ? "¿Cuánto añades al ahorro?" : "¿Cuánto retiras del ahorro?");
    if (amt == null) return;
    if (pot) {
      const nv = Math.max(0, Math.round((Number(pot.saved || 0) + sign * amt) * 100) / 100);
      const { error } = await sb.from("goals").update({ saved: nv }).eq("id", pot.id);
      if (error) { toast("No se pudo guardar"); return; }
      pot.saved = nv;
    } else if (sign > 0) {
      const { data, error } = await sb.from("goals").insert({ user_id: state.user.id, name: "Ahorro", target: null, saved: amt, icon: "🏦" }).select().single();
      if (error) { toast(goalsTableMissing(error) ? "Falta crear la tabla en Supabase: ejecuta el SQL de «goals»." : "No se pudo guardar"); return; }
      state.goals.push(data);
    } else {
      toast("No tienes ahorro para retirar"); return;
    }
    renderSavings();
  };
  $("#ahorro-add", v).addEventListener("click", () => changeAhorro(1));
  $("#ahorro-sub", v).addEventListener("click", () => changeAhorro(-1));

  // Nueva meta: nombre + objetivo (obligatorio), sin icono.
  $("#new-goal-btn", v).addEventListener("click", () => $("#new-goal-form", v).classList.toggle("hidden"));
  $("#g-create", v).addEventListener("click", async () => {
    const name = $("#g-name", v).value.trim();
    if (!name) { toast("Ponle un nombre a la meta"); return; }
    const traw = $("#g-target", v).value.replace(",", ".").trim();
    const target = traw ? Math.round(parseFloat(traw) * 100) / 100 : null;
    if (!target || target <= 0) { toast("Pon un objetivo válido"); return; }
    const { data, error } = await sb.from("goals").insert({ user_id: state.user.id, name, target, saved: 0, icon: "🎯" }).select().single();
    if (error) { toast(goalsTableMissing(error) ? "Falta crear la tabla en Supabase: ejecuta el SQL de «goals»." : "No se pudo crear la meta"); return; }
    state.goals.push(data);
    renderSavings();
  });

  const list = $("#metas-list", v);
  if (metas.length === 0) {
    list.appendChild(emptyState("Aún no hay metas", "Crea una meta con un objetivo y ve llenándola."));
  } else {
    metas.forEach(g => list.appendChild(metaCardEl(g)));
  }
}

function metaCardEl(g) {
  const saved = Number(g.saved || 0);
  const target = Number(g.target);
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const done = saved >= target;
  const left = Math.max(0, Math.round((target - saved) * 100) / 100);
  const card = el("div", "card");
  card.innerHTML = `
    <div class="goal-top">
      <div class="goal-ic">🎯</div>
      <div class="goal-name">${escapeHtml(g.name)}</div>
      <div class="goal-saved num">${pct}%</div>
    </div>
    <div class="bar" style="margin-top:2px"><i style="width:${pct}%;background:var(--income)"></i></div>
    <div class="goal-sub">
      <span class="num">${fmt(saved)} / ${fmt(target)}</span>
      <span>${done ? "¡Conseguido! 🎉" : "faltan " + fmt(left)}</span>
    </div>
    <div class="goal-actions">
      <button class="add" data-act="add">+ Añadir</button>
      <button data-act="sub">− Retirar</button>
      <button class="del" data-act="del" aria-label="Eliminar meta">🗑️</button>
    </div>`;

  const change = async (sign) => {
    const amt = askAmount(sign > 0 ? "¿Cuánto añades?" : "¿Cuánto retiras?");
    if (amt == null) return;
    const nv = Math.max(0, Math.round((saved + sign * amt) * 100) / 100);
    const { error } = await sb.from("goals").update({ saved: nv }).eq("id", g.id);
    if (error) { toast("No se pudo guardar"); return; }
    g.saved = nv;
    renderSavings();
  };
  card.querySelector('[data-act="add"]').addEventListener("click", () => change(1));
  card.querySelector('[data-act="sub"]').addEventListener("click", () => change(-1));
  card.querySelector('[data-act="del"]').addEventListener("click", async () => {
    if (!confirm(`¿Eliminar la meta "${g.name}"?`)) return;
    const { error } = await sb.from("goals").delete().eq("id", g.id);
    if (error) { toast("No se pudo eliminar"); return; }
    state.goals = state.goals.filter(x => x.id !== g.id);
    toast("Meta eliminada");
    renderSavings();
  });
  return card;
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
        category: t.category, method: t.method || "efectivo", date: t.date, note: t.note || "",
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
        <div class="tx-sub">${fmtDate(t.date)} · ${txMethod(t) === "tarjeta" ? "💳" : "💵"}${t.note ? " · " + escapeHtml(t.note) : ""}</div></div>
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
