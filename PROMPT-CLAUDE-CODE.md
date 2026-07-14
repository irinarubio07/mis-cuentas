# Mensaje para pegar en Claude Code

Copia esto como primer mensaje en tu sesión de Claude Code (dentro de la carpeta del proyecto).
Ajusta la última parte con lo que quieras hacer.

---

Estás en el proyecto "Mis Cuentas", una PWA de finanzas personales.

Antes de proponer nada, ponte en contexto:
1. Lee `CLAUDE.md` (stack, modelo de datos y convenciones) y `README.md`.
2. Échale un vistazo a `index.html` (estructura + estilos) y `app.js` (lógica y vistas).
3. Resúmeme en 4-5 líneas cómo está montado el proyecto y confírmame que has entendido
   el patrón de datos (estado en memoria + mutaciones async contra Supabase) y las reglas RLS.

Trabaja siempre así: primero **explora**, luego **propón un plan** y espera mi visto bueno,
después **implementa**, y al final resume los cambios. No cambies el stack (nada de frameworks
ni bundlers) ni toques la seguridad RLS sin avisarme. La interfaz va en español.

Recuerda: no tienes acceso a mi base de datos de Supabase; cualquier cambio de esquema
entrégamelo como SQL para que yo lo ejecute, y mantén `supabase-setup.sql` actualizado.

Cuando termines el resumen, dime qué te parecen estas posibles mejoras (o proponme otras):
- Presupuestos mensuales por categoría con aviso al acercarse al límite.
- Filtros por rango de fechas y búsqueda en el historial.
- Editar un movimiento ya creado (ahora solo se puede borrar).
- Vista anual con totales por mes y comparativa año actual vs anterior.
- Modo oscuro respetando las variables CSS.

De momento no implementes nada; espera a que elija.
