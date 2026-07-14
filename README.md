# Mis Cuentas

PWA personal para llevar tus **ingresos y gastos**, con login real y datos sincronizados entre
ordenadores. Sin framework ni paso de build: HTML + CSS + JavaScript, **Supabase** (login + base de
datos) y **GitHub Pages** (hosting gratuito).

- Panel con saldo, ingresos/gastos del mes, gráfico de 6 meses y desglose por categoría.
- Pestañas para añadir movimientos, ver el historial y ajustar categorías/moneda.
- Instalable como app en el móvil y con carga offline de la interfaz.

## Estructura

```
index.html            Estructura + todos los estilos
app.js                Toda la lógica (Supabase, auth, estado, vistas)
config.js             Tus claves de Supabase (URL + clave pública)
config.example.js     Plantilla de config.js
supabase-setup.sql    Crea tablas + seguridad por usuario (RLS)
sw.js                 Service worker (offline)
manifest.webmanifest  Metadatos de la PWA
icons/                Iconos de la app
CLAUDE.md             Contexto del proyecto para Claude Code
GUIA.md               Guía paso a paso de despliegue (Supabase + GitHub Pages)
```

## Puesta en marcha (resumen)

El detalle completo está en **`GUIA.md`**. En corto:

1. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta `supabase-setup.sql` en su SQL Editor.
2. Copia la *Project URL* y la *clave pública (anon)* en `config.js`.
3. Sube el repositorio a GitHub y activa **Settings → Pages** (rama `main`, raíz).
4. Abre la URL de Pages, regístrate y entra desde donde quieras.

## Desarrollo local

El service worker y Supabase necesitan `http`/`localhost` (no `file://`). Arranca un servidor estático:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

Necesitas un `config.js` válido para que el login funcione en local.

## Trabajar con Claude Code

Este repo ya trae un `CLAUDE.md` que Claude Code lee al iniciar sesión, con el stack, el modelo de
datos y las convenciones. Para empezar:

1. Instala Claude Code (guía oficial: <https://code.claude.com/docs/en/setup>).
   - Instalador nativo (recomendado): `curl -fsSL https://claude.ai/install.sh | bash`
     (en Windows: `irm https://claude.ai/install.ps1 | iex`).
   - O por npm (Node 22+): `npm install -g @anthropic-ai/claude-code@latest`.
2. Entra en la carpeta del proyecto y ejecuta `claude`.
3. Autentícate con tu cuenta de Claude (Pro/Max) o una clave de API.
4. Pídele cambios en lenguaje natural (hay ideas en `PROMPT-CLAUDE-CODE.md`).

## Publicar cambios

Haz commit y push a `main`; GitHub Pages se actualiza solo. Si tocas archivos cacheados por el
service worker, sube la versión de `CACHE` en `sw.js` para forzar la actualización.

## Git (primera subida)

```bash
git init
git add .
git commit -m "Primera versión de Mis Cuentas"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/mis-cuentas.git
git push -u origin main
```

## Notas

- La *clave pública (anon)* de Supabase está pensada para el navegador; la seguridad la garantiza
  RLS. La clave secreta NO se usa en la app.
- La moneda es una preferencia local por dispositivo; el resto de datos se sincroniza vía Supabase.
