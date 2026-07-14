# Bitácora de «Mis Cuentas»

Registro de lo que se hace en cada sesión, para poder retomar el trabajo desde cualquier
equipo (oficina / portátil de casa). Lo más reciente arriba.

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

**Pendiente / próximos pasos:**
- [ ] Definir la identidad de git (nombre + email) para poder commitear.
- [ ] Crear cuenta/repositorio en GitHub y hacer el primer `push`.
- [ ] Clonar el repo en el portátil de casa.
- [ ] Rellenar `config.js` con las claves reales de Supabase (solo una vez; viaja por git).
- [ ] **Iconos:** la carpeta `icons/` está vacía; generar `icon-192/512/maskable`
      (el service worker no llega a instalarse sin ellos). Primera mejora propuesta.

**Rutina para dos equipos:** al empezar en cualquier ordenador → `git pull`. Al terminar → `commit` + `push`.
