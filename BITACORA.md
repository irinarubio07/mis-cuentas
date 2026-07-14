# Bitácora de «Mis Cuentas»

Registro de lo que se hace en cada sesión, para poder retomar el trabajo desde cualquier
equipo (oficina / portátil de casa). Lo más reciente arriba.

---

## 2026-07-14 — Ajuste: caja de Fecha igual de alta que la de Nota 📐

**Hecho:**
- Tras apilar Fecha/Nota, la caja de Fecha quedaba ~2px más alta que la de Nota (el
  `input[type=date]` nativo tiene una altura intrínseca mayor). Igualadas con
  `.grid2 .field input{height:50px}` (altura fija → misma caja en cualquier dispositivo).
  Medido y verificado: ambas 50px, sin recortar la fecha ni el icono del calendario.
- Subida la versión del service worker `CACHE` `v5`→`v6`.

---

## 2026-07-14 — Arreglo: Fecha y Nota se solapaban en móvil 📱

**Hecho:**
- En «Nuevo movimiento», la fila Fecha + Nota (`.grid2`, dos columnas `1fr 1fr`) se apretaba y
  llegaba a solaparse en móvil: el `input[type=date]` nativo no encoge por debajo de su ancho
  mínimo y empujaba al campo de Nota.
- Arreglo en `index.html`: `.grid2` pasa a `minmax(0,1fr) minmax(0,1fr)` (las columnas ya pueden
  encoger) y, en pantallas estrechas, `@media (max-width:440px)` las **apila** en una sola
  columna a lo ancho. Reproducido a 320px y verificado que ya no se solapan; consola sin errores.
- Subida la versión del service worker `CACHE` `v4`→`v5`.

**Siguiente:** elegir la próxima mejora funcional (presupuestos, filtros/búsqueda, editar
movimientos, vista anual, modo oscuro).

---

## 2026-07-14 — Nueva paleta veraniega (azul pálido + amarillo + lila) 🌤️

**Hecho:**
- Rediseñada la paleta a petición de la usuaria (la terracota anterior no le gustó): fondo
  **amarillo anaranjado difuminado** (degradado en `body`), marca en **azul pálido veraniego**
  (`--pine` `#8FBFDB`), ingresos **verde** (`--income` `#2E9E52`), gastos **rojo rosado**
  (`--expense` `#CE4463`) e **iconos de la barra en lila** (`--lilac` `#B8A6E0`; el activo y el
  botón "+" en `--lilac-deep` `#7A5CBE`).
- Como la marca ahora es **clara**, el texto que va encima (barra, tarjeta de saldo, botones,
  chips) pasó de blanco a **azul oscuro** con un token nuevo `--on-pine` `#123A50`.
- Sincronizado a juego: `<meta theme-color>` y el `manifest` (`theme_color` `#8FBFDB`,
  `background_color` `#FFF1CE`), **iconos regenerados** (`tools/make-icons.py`: fondo azul pálido
  + marca azul oscuro) y versión del service worker `CACHE` `v3`→`v4`. `app.js` no necesitó
  cambios (la gráfica ya usa `var(--income/--expense)`).
- **Verificado en local** con sesión iniciada: panel y «nuevo movimiento» se ven correctos y
  legibles (contraste: texto oscuro sobre la marca ~6:1; cifras ≥4:1) y la consola no da errores.
- ⚠️ **Aviso SW:** el service worker seguía sirviendo la versión anterior desde caché; hubo que
  limpiarla para ver los cambios. Al cambiar estilos, tras subir el `CACHE` puede hacer falta
  **recargar dos veces** (o limpiar el SW) para que se vea lo nuevo.

**Siguiente:** elegir la próxima mejora funcional (presupuestos, filtros/búsqueda, editar
movimientos, vista anual, modo oscuro).

---

## 2026-07-14 — Paleta cálida/veraniega (terracota) 🌅

**Hecho:**
- Cambiada la paleta a una **cálida y veraniega** (terracota/melocotón sobre crema), a partir de
  una referencia pastel de la usuaria («colores más cálidos, no tan fuertes»).
- Nuevos tokens en `:root` (`index.html`): marca `--pine` `#AE5D42` (terracota), papel `--paper`
  `#FCF4EC`, tinta `#4A342B`, ingresos `--income` `#47835B` (verde), gastos `--expense` `#C1546E`
  (rosa hibisco), + tintes suaves a juego y sombra cálida. Todo lo demás cascada desde estas variables.
- Sincronizados los puntos que deben ir a juego: `<meta theme-color>` y el `manifest`
  (`theme_color`/`background_color`), y **regenerados los 3 iconos** con `tools/make-icons.py`
  (constante `PINE` → terracota). Subida la versión del service worker `CACHE` `v2`→`v3`.
- **Contraste verificado** (blanco sobre la marca 4.73:1; cifras sobre el papel ≥4:1) y comprobado
  en local: la pantalla de login se ve correcta y la consola no da errores. El panel y los
  movimientos comparten las mismas variables (no se pudo iniciar sesión real desde aquí para verlos
  en vivo, pero heredan los colores nuevos).

**Siguiente:** elegir la próxima mejora funcional (presupuestos, filtros/búsqueda, editar movimientos,
vista anual, modo oscuro).

---

## 2026-07-14 — Publicado y en marcha 🎉

**Hecho:**
- Activado **GitHub Pages** (Deploy from a branch: `main` / root). La app está **en vivo** en
  **https://irinarubio07.github.io/mis-cuentas/** (verificado HTTP 200, con `config.js` real e iconos).
- **Puesta en marcha COMPLETA:** sincronización entre 2 equipos (Git + SSH), PWA con iconos,
  Supabase conectado y verificado, y hosting en Pages. La app ya se usa y se instala en el móvil.

**Siguiente (próximas sesiones):** elegir mejoras — presupuestos por categoría, filtros/búsqueda
en el historial, editar movimientos, vista anual comparativa, modo oscuro.

---

## 2026-07-14 — Supabase conectado (mejora B)

**Hecho:**
- Creado el proyecto Supabase `mis-cuentas` (Project ID `jfaahwitcosygbksvmvy`, región eu-central-1),
  ejecutado `supabase-setup.sql` (tablas + RLS) y rellenado `config.js` con la URL y la clave
  **publishable** (pública, `sb_publishable_...`).
- Verificado vía REST: credenciales válidas (200) y tablas `transactions` y `categories`
  existentes con RLS activo (consulta anónima devuelve `[]`). La app ya puede iniciar sesión.

**Siguiente:** publicar en GitHub Pages para usar la app desde el móvil y los dos equipos, y
probar el registro/login real.

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
