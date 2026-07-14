# Bitácora de «Mis Cuentas»

Registro de lo que se hace en cada sesión, para poder retomar el trabajo desde cualquier
equipo (oficina / portátil de casa). Lo más reciente arriba.

---

## 2026-07-14 — Iconos de la PWA (mejora A)

**Hecho:**
- Creado `tools/make-icons.py` (generador sin dependencias, solo librería estándar) y generados
  los tres PNG que faltaban: `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`
  (marca de la app: gráfico ascendente blanco sobre verde pino `#0E5C4A`).
- Subida la versión del service worker `CACHE` (`...-v1` → `...-v2`) porque cambian los archivos
  cacheados. Con los iconos ya presentes, `cache.addAll(...)` deja de fallar: el SW instala y la
  PWA vuelve a ser instalable / con carga offline de la interfaz.

**Siguiente:** poner en marcha Supabase (mejora B) para que la app inicie sesión y guarde datos.

---

## 2026-07-14 — Puesta en marcha del repositorio

**Contexto:** primera sesión. Se parte del proyecto base «Mis Cuentas» (PWA vanilla + Supabase),
que será el punto de partida para adaptarlo por pasos.

**Hecho:**
- Explorado todo el código (`index.html`, `app.js`, `supabase-setup.sql`, `sw.js`, `manifest`, `config`).
  Confirmado el patrón de datos (estado en memoria + mutaciones async a Supabase) y las políticas RLS.
- Inicializado el repositorio git en la rama `main` y añadido `.gitignore`.
- Añadida la sección «Flujo de trabajo (Git + documentación)» a `CLAUDE.md`.
- Creada esta bitácora.
- Configurada la identidad de git (Irina Rubió <irinarubio07@gmail.com>) y hecho el primer commit (`1f14ca2`).
- Generada una clave SSH (ed25519) en este equipo y añadida a GitHub; conexión verificada.
- Conectado el remoto `origin` = `git@github.com:irinarubio07/mis-cuentas.git` y hecho el primer `push`.
  El repositorio ya está publicado: https://github.com/irinarubio07/mis-cuentas

**Pendiente / próximos pasos:**
- [ ] **Portátil de casa:** instalar Git + Claude Code, generar allí su PROPIA clave SSH y añadirla a GitHub,
      y clonar con `git clone git@github.com:irinarubio07/mis-cuentas.git`.
- [ ] **Supabase:** crear el proyecto, ejecutar `supabase-setup.sql` y rellenar `config.js` con la URL + clave
      pública (anon). Sin esto la app no puede iniciar sesión todavía. Viaja por git, se hace una vez.
- [ ] **Iconos:** la carpeta `icons/` está vacía; generar `icon-192/512/maskable`
      (el service worker no llega a instalarse sin ellos). Primera mejora de código propuesta.

**Rutina para dos equipos:** al empezar en cualquier ordenador → `git pull`. Al terminar → `commit` + `push`.
