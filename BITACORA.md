# Bitácora de «Mis Cuentas»

Registro de lo que se hace en cada sesión, para poder retomar el trabajo desde cualquier
equipo (oficina / portátil de casa). Lo más reciente arriba.

---

## 2026-07-15 — Ajustes al icono superior + barra inferior más limpia ⚙️

**Hecho (según feedback):**
- Quitados los **títulos** de la barra superior (franja azul); ya no muestra «Panel»/«Movimientos»/etc.
- El icono de **Ajustes** (engranaje) pasa a la **esquina superior izquierda**, del mismo tamaño que
  el botón de salir (clase compartida `.abtn`, 36px). Abre la vista Ajustes y se resalta al estar activo.
- Quitado el botón **Ajustes** de la barra inferior, que queda con 4: Panel · Movimientos · ＋ · Ahorro.
- Limpieza: eliminados `VIEW_TITLES` y la asignación a `#appbar-title` (ya no existe).
- Verificado en local (DOM + captura); consola sin errores. `CACHE` `v11`→`v12`.

---

## 2026-07-15 — Ahorro: bote único + metas afinadas 🐷

**Hecho (ajuste sobre la pestaña Ahorro, según feedback):**
- **Ahorro** pasa a ser un **único bote** («Ahorro acumulado») al que solo se **suma** dinero
  (＋ Añadir), en vez de una lista. Se guarda como el registro `goals` sin objetivo (target NULL);
  se crea solo al añadir por primera vez.
- **Metas:** el alta se simplifica a **nombre + objetivo** (se quita el selector de icono; icono
  fijo 🎯) y el objetivo pasa a ser **obligatorio**.
- Cada meta muestra **«X € / objetivo €»** con **barra horizontal** que se va llenando, el % y
  «faltan Z».
- Verificado en local con datos en memoria; consola sin errores. `CACHE` `v9`→`v10`.

---

## 2026-07-15 — Nueva pestaña «Ahorro» (metas y ahorro) 🎯

**Hecho:**
- Nueva vista **Ahorro** con su botón en la barra inferior (entre el + y Ajustes; icono diana),
  a elección de la usuaria.
- **Metas** con objetivo: barra de progreso (llevas X de Y, faltan Z, %) y estado «¡Conseguido!».
  **Ahorro** sin objetivo: solo acumula. Arriba, el **total ahorrado**. Es independiente del saldo
  de movimientos.
- Cada meta: botones **+ Añadir / − Retirar** (prompt para la cantidad) y borrar; alta con nombre,
  objetivo opcional e icono (emoji).
- **Base de datos:** tabla nueva `goals` (name, target NULL, saved, icon) con índice y RLS, añadida
  a `supabase-setup.sql`. ⚠️ La usuaria debe ejecutar ese SQL en Supabase. La carga tolera que la
  tabla aún no exista (goals = []), y el alta avisa si falta.
- Verificado en local con metas de prueba en memoria (sin tocar Supabase): total, secciones, barras
  de progreso, formulario de alta y navegación correctos; consola sin errores. `CACHE` `v8`→`v9`.

**Siguiente:** (a elegir) presupuestos por categoría, editar movimientos, vista anual, modo oscuro,
o un gráfico de evolución del ahorro.

---

## 2026-07-14 — Método de pago (efectivo/tarjeta) en movimientos 💵💳

**Hecho:**
- Nueva dimensión **método de pago** en cada movimiento (ingresos y gastos): `efectivo` o `tarjeta`.
- **Base de datos:** columna `method` en `transactions` (default `efectivo`, check efectivo/tarjeta).
  Añadida a `supabase-setup.sql` (en el CREATE y como ALTER idempotente para bases ya existentes).
  ⚠️ La usuaria debe ejecutar ese ALTER en su Supabase para que el guardado funcione.
- **Formulario «Nuevo movimiento»:** selector Método (💵 Efectivo / 💳 Tarjeta) antes de Categoría;
  el insert incluye `method`. Si la columna aún no existe, el toast avisa de que falta el SQL.
- **Movimientos:** segunda fila de filtros Todo / Efectivo / Tarjeta (se combina con Todos/Ingresos/
  Gastos), tarjeta de **resumen** con el saldo del filtro activo (total de efectivo, de tarjeta o
  combinado en «Todo») y cada fila muestra 💵/💳. Los movimientos sin método se tratan como efectivo.
- Verificado en local con datos de prueba (solo en memoria del navegador, sin tocar Supabase):
  filtros, resumen y sumas correctos (Todo 1310, Efectivo 160); consola sin errores. `CACHE` `v7`→`v8`.

**Siguiente:** (a elegir) presupuestos por categoría, editar movimientos, vista anual, modo oscuro.

---

## 2026-07-14 — Fecha en iOS + entrega fiable de actualizaciones 🍏

**Hecho:**
- La usuaria seguía viendo la caja de Fecha distinta (alta y con la fecha centrada). Causa: en
  **iOS**, `input[type=date]` con apariencia nativa se dibuja alto/centrado, y el navegador
  Chromium integrado (con el que verifico) NO reproduce ese render — por eso no se detectaba, y el
  `height:50px` de v6 no bastaba.
- Arreglo iOS en `index.html`: `input[type=date]` → `-webkit-appearance:none; appearance:none;
  text-align:left` y `::-webkit-date-and-time-value{margin:0;text-align:left}` (quita el margen
  interno que le daba altura y lo centraba). Ahora se comporta como un input de texto.
- **Service worker → network-first** para nuestros archivos (HTML/JS/CSS/iconos): con conexión se
  ve SIEMPRE la última versión al abrir; sin conexión, la caché. Los recursos externos (supabase-js
  del CDN) siguen cache-first para abrir offline. Resuelve el problema recurrente de que las
  actualizaciones no llegaban al móvil. `CACHE` `v6`→`v7`.
- Verificado en Chromium (sin regresión: fecha y nota a 50px, alineadas; consola sin errores). El
  render de iOS no se puede reproducir aquí; pendiente de que la usuaria lo confirme en su iPhone.

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
