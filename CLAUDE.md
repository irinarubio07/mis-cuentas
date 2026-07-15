# Mis Cuentas

App web personal (PWA) para registrar ingresos y gastos, con panel/dashboard y login real.
Los datos se guardan en **Supabase** y se sincronizan entre dispositivos. Se aloja gratis en
**GitHub Pages**. La interfaz está **en español** y así debe permanecer.

## Qué es (contexto)

- Un solo usuario por cuenta gestiona sus finanzas: registra movimientos, los ve en un panel
  con saldo, ingresos/gastos del mes, gráfico de 6 meses y desglose por categoría.
- Prioridades del proyecto: que sea **simple, sin build, fácil de desplegar y de mantener**.
  No conviertas esto en un proyecto con framework/bundler salvo que el usuario lo pida.

## Stack

- **Frontend:** HTML + CSS + JavaScript "vanilla". Sin framework, sin bundler, sin paso de build.
- **Única dependencia externa:** `@supabase/supabase-js@2`, cargada por `<script>` desde CDN
  (jsDelivr) en `index.html`. No hay `node_modules` ni `package.json` en tiempo de ejecución.
- **Backend:** Supabase (Auth con email/contraseña + Postgres). Ver `supabase-setup.sql`.
- **Hosting:** GitHub Pages (sitio estático servido desde la rama `main`, carpeta raíz).

## Mapa de archivos

- `index.html` — estructura + **todo el CSS** (en `<style>`), pantallas (config, login, app) y
  la barra de pestañas. Carga supabase-js, `config.js` y `app.js` al final.
- `app.js` — **toda la lógica**: cliente de Supabase, auth, carga de datos, estado en memoria,
  y el render de las 5 vistas (panel, añadir, movimientos, ahorro, ajustes).
- `config.js` — SOLO la URL del proyecto y la **clave pública (anon)** de Supabase. Se puede
  commitear sin riesgo (la seguridad la da RLS). NUNCA pongas aquí la clave `service_role`/secret.
- `config.example.js` — plantilla de `config.js`.
- `supabase-setup.sql` — crea tablas, índices y políticas RLS. Se ejecuta una vez en Supabase.
- `sw.js` — service worker (cachea la interfaz para carga offline; NO cachea llamadas a Supabase).
- `manifest.webmanifest` + `icons/` — hacen la app instalable como PWA.
- `GUIA.md` — guía paso a paso de despliegue (Supabase + GitHub Pages) para el usuario final.

## Cómo ejecutar en local

El service worker y supabase-js **requieren un contexto seguro** (http/localhost), así que
**no** funciona abriendo el archivo con `file://`. Levanta un servidor estático:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

(Alternativa: `npx serve` si prefieres Node.) Para que el login funcione en local, hace falta
un `config.js` válido con las claves de un proyecto Supabase real.

## Cómo desplegar

Es GitHub Pages: haz commit y push a `main`. Pages se reconstruye solo en ~1 minuto.
Si cambias archivos que cachea el service worker (`index.html`, `app.js`, `sw.js`, iconos…),
**sube la versión** de la constante `CACHE` en `sw.js` (`...-v1` → `...-v2`) para que los
navegadores recojan la versión nueva.

## Modelo de datos (Supabase / Postgres)

Tres tablas en el esquema `public`, todas con RLS activado y política "cada usuario solo ve lo suyo"
(ver `supabase-setup.sql`):

- `transactions(id uuid, user_id uuid, type text['income'|'expense'], amount numeric(12,2)>0,
  category text, method text['efectivo'|'tarjeta'] default 'efectivo', date date, note text, created_at timestamptz)`
- `categories(id uuid, user_id uuid, type text['income'|'expense'], name text, icon text)`
- `goals(id uuid, user_id uuid, name text, target numeric(12,2) NULL, saved numeric(12,2)>=0 default 0,
  icon text, created_at timestamptz)` — metas de ahorro; `target` NULL = sin objetivo (ir acumulando).

`user_id` referencia `auth.users(id)`. Si cambias el esquema, actualiza también `supabase-setup.sql`
y da al usuario el SQL de migración a ejecutar en su proyecto (no tienes acceso a su base de datos).

## Convenciones (respétalas)

- **Idioma:** toda la UI y los textos, en español.
- **Diseño:** los colores y tipos son variables CSS en `:root` (en `index.html`). Estética
  **veraniega**: cifras con fuente **monoespaciada** y `tabular-nums` (clase `.num`); marca en
  **azul pálido** (`--pine`, con texto oscuro `--on-pine` encima), fondo **amarillo anaranjado
  difuminado** (degradado en `body`), **verde** (`--income`) para ingresos, **rojo rosado**
  (`--expense`) para gastos y **lila** (`--lilac` / `--lilac-deep`) en los iconos de la barra de
  pestañas. Reutiliza estas variables; no metas colores sueltos.
- **Patrón de datos en `app.js`:** hay un objeto `state` en memoria (`state.tx`, `state.cats`,
  `state.user`, `state.currency`). Las funciones de render son **síncronas** y leen de `state`.
  Las mutaciones son **async**: llaman a Supabase, y solo si va bien actualizan `state` y
  re-renderizan. Sigue ese patrón al añadir cosas.
- **Inserciones:** incluye SIEMPRE `user_id: state.user.id` en cada `insert` (lo exige RLS).
- **Importes:** número positivo con 2 decimales; el signo lo pone la UI según `type`.
- **SVG:** para colorear con variables CSS usa `style="fill:var(--x)"`, NO el atributo
  `fill="var(--x)"` (no se resuelve como atributo de presentación).
- **Moneda:** es preferencia local (`localStorage`), no se sincroniza. El formato usa
  `Intl.NumberFormat('es-ES', {style:'currency', currency: state.currency})`.

## Comprobaciones antes de dar por bueno un cambio

No hay framework de tests. Como mínimo:

- `node -c app.js` y `node -c sw.js` para validar sintaxis.
- Levantar el servidor local y probar el flujo tocado (login, añadir, listar, ajustes).
- Revisar la consola del navegador: no debe haber errores.

## Cosas que NO hacer

- No pongas la clave secreta/`service_role` en el cliente ni en el repo.
- No guardes datos financieros en `localStorage`: los datos van a Supabase (solo la moneda es local).
- No rompas ni desactives las políticas RLS.
- No migres a un framework (React, Vue…) ni añadas un bundler sin que el usuario lo pida.
- No asumas acceso a la base de datos del usuario: los cambios de esquema se entregan como SQL.

## Flujo de trabajo (Git + documentación)

El proyecto se desarrolla desde **dos equipos** (oficina y portátil de casa). GitHub es la
fuente de verdad que los sincroniza. Reglas:

- **Al empezar** cualquier sesión en cualquier equipo: `git pull` antes de tocar nada.
- **Al terminar** un cambio verificado: `git commit` con mensaje claro en español y `git push`.
  Una vez existe el remoto, commitea y sube **siempre** tras cada cambio (no lo dejes sin subir).
- **Documenta cada sesión** en `BITACORA.md` (qué se hizo y qué queda pendiente) y mantén
  al día `README.md`, `GUIA.md` y este `CLAUDE.md` cuando cambie el comportamiento o el esquema.
- `config.js` se versiona a propósito (solo lleva la clave pública anon); se rellena una vez
  y viaja por git a los dos equipos. La clave secreta/`service_role` nunca entra en el repo.
