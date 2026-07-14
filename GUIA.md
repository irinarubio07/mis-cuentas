# Mis Cuentas — guía de puesta en marcha

App de finanzas personales con login real y datos sincronizados entre todos tus ordenadores.
Alojamiento gratis en **GitHub Pages** + base de datos y login en **Supabase**.

Tiempo aproximado: 15-20 minutos. No hace falta saber programar.

---

## Parte 1 · Crear la base de datos en Supabase

1. Entra en https://supabase.com y crea una cuenta (gratis).
2. Pulsa **New project**. Ponle un nombre (p. ej. `mis-cuentas`), elige una contraseña para la base de datos y una región cercana (Europe). Espera 1-2 min a que se cree.
3. En el menú lateral abre **SQL Editor → New query**. Copia todo el contenido de `supabase-setup.sql`, pégalo y pulsa **Run**. Debe decir "Success".
4. Ve a **Project Settings → API** y copia dos cosas:
   - **Project URL** → algo como `https://abcdxyz.supabase.co`
   - La **clave pública** → aparece como *anon public* o *publishable key* (NO la *secret*).

> Recomendado para uso personal: en **Authentication → Providers → Email**, desactiva **"Confirm email"**. Así podrás entrar justo después de registrarte sin tener que confirmar por correo. Si lo dejas activado, tras registrarte recibirás un email de confirmación antes de poder entrar.

---

## Parte 2 · Pegar tus claves en la app

1. Abre el archivo **`config.js`** con cualquier editor de texto.
2. Sustituye los marcadores por tus datos:

```js
window.SUPABASE_CONFIG = {
  url: "https://abcdxyz.supabase.co",
  key: "eyJhbGciOi...tu-clave-publica..."
};
```

3. Guárdalo. (Esa clave pública está pensada para usarse en el navegador; tus datos siguen protegidos por la seguridad por usuario que activó el SQL.)

---

## Parte 3 · Publicar en GitHub Pages

1. Crea una cuenta en https://github.com si no la tienes.
2. Pulsa **New repository**. Nombre: p. ej. `mis-cuentas`. Puedes dejarlo **Private** si prefieres.
3. En la página del repositorio vacío, pulsa **uploading an existing file** y arrastra TODOS estos archivos y la carpeta `icons/`:
   - `index.html`, `app.js`, `config.js` (ya con tus claves), `sw.js`, `manifest.webmanifest`
   - la carpeta `icons/` con los tres PNG
   Confirma con **Commit changes**.
4. Ve a **Settings → Pages**. En **Source** elige **Deploy from a branch**, rama **main** y carpeta **/ (root)**. Guarda.
5. Espera ~1 minuto y recarga: aparecerá la dirección pública, algo como
   `https://tu-usuario.github.io/mis-cuentas/`.

---

## Parte 4 · Usarla

1. Abre esa dirección en el navegador (ordenador o móvil).
2. La primera vez pulsa **"Crea una"**, regístrate con tu correo y contraseña. Ya estás dentro.
3. En **cualquier otro ordenador**, abre la misma dirección e inicia sesión con ese correo y contraseña: verás exactamente los mismos datos.
4. En el móvil, desde el navegador puedes usar **"Añadir a pantalla de inicio"** para instalarla como app.

---

## Actualizar la app más adelante

Sube el archivo cambiado al repositorio (arrastrar y soltar reemplaza el anterior). Si cambias `app.js`, `index.html` o `sw.js`, sube también el número de versión en la primera línea de `sw.js` (`...-v1` → `...-v2`) para que el navegador coja la versión nueva.

## Notas

- **Seguridad**: cada cuenta solo ve sus propios movimientos (lo garantiza RLS en el SQL). La clave "secret" de Supabase no se usa en ningún momento en la app.
- **Sin conexión**: la app abre offline, pero para guardar o leer datos necesita internet (los datos viven en Supabase).
- **Copia de seguridad**: en Ajustes puedes exportar tus movimientos a un archivo cuando quieras.
- **Coste**: el plan gratuito de Supabase y GitHub Pages es de sobra para uso personal.
