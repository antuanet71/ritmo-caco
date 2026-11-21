# Cesta: puesta en marcha

Cesta es la lista de la compra de la familia. **Todo vive en una hoja de cálculo de Google**: los datos en sus pestañas y la app en su script. Cada familia tiene su propia copia y nadie más ve sus datos.

- **Config**: los correos de Gmail que pueden entrar (columna `correo`) y cómo se llaman (`nombre`).
- **Categorias, Productos, Personas, Supers**: el catálogo. Se puede editar a mano.
- **Lista**: lo que hay que comprar ahora.
- **Historial**: cada compra con su fecha (para estimar más adelante cuándo hará falta).

> Usa una cuenta de **Gmail personal**. Las cuentas de colegio o empresa suelen bloquear compartir con Gmail de fuera.

## 1. Crear la hoja (una vez, unos 10 minutos, desde el ordenador)

1. Crea una hoja de cálculo nueva en <https://sheets.new> y llámala, por ejemplo, `Cesta · Casa Toño`.
2. **Extensiones › Apps Script**. Se abre el editor.
3. En `Código.gs` borra lo que haya y pega todo [`backend/Code.gs`](backend/Code.gs).
4. Pulsa **+** junto a «Archivos» › **HTML**, llámalo `Index` (sin `.html`) y pega todo [`backend/Index.html`](backend/Index.html).
5. Guarda (icono del disquete). Arriba elige la función **preparar** y pulsa **Ejecutar**. Acepta los permisos: si sale «Google no ha verificado esta aplicación», pulsa «Configuración avanzada» › «Ir a …». Es tu propio script.
6. Vuelve a la hoja: ya tiene todas las pestañas y el catálogo de ejemplo. En **Config** escribe los Gmail de tu familia, uno por fila.
7. En la hoja aparece el menú **Cesta › Dar acceso a los correos de Config**. Úsalo: comparte la hoja con esos correos.
8. En el editor del script: **Implementar › Nueva implementación** › tipo **Aplicación web**:
   - Ejecutar como: **Usuario que accede a la aplicación web**
   - Quién tiene acceso: **Cualquier usuario con cuenta de Google**
   - Pulsa Implementar y copia la **URL** (termina en `/exec`). Esa es la dirección de la app.

## 2. En los móviles

- Abre la URL con la cuenta de Gmail que está en Config. La primera vez Google pide permiso (mismo aviso de antes, «Configuración avanzada» › «Ir a …»).
- Para tenerla como app: Android, menú de Chrome › «Añadir a pantalla de inicio». iPhone, Safari › Compartir › «Añadir a pantalla de inicio».
- Si en el móvil tienes varias cuentas de Google y sale un error de acceso, ábrela en una ventana donde solo esté la cuenta de Config.

Quien no esté en Config ve un aviso y no puede entrar.

## Otra familia

**Archivo › Hacer una copia** de la hoja (el script se copia con ella). En la copia: borra los datos de Lista e Historial si quieres, cambia los correos de Config, usa **Cesta › Dar acceso** y haz el paso 8 (su propia implementación, con su propia URL). Tú no ves nada de esa familia.

## Uso

Un toque añade, cada toque más suma uno, y con doble toque (o manteniendo pulsado) eliges persona, súper y cantidad. En la Lista, al tocar se tacha y vuelve al catálogo. Lo tachado desaparece de la lista al día siguiente y queda guardado en Historial.

## Editar a mano en la hoja

- En **Productos** basta con escribir el nombre, la categoría y el súper **por su nombre** (por ejemplo `Champú`, `Higiene`, `Mercadona`). La app completa el resto al abrirse.
- Para quitar o mover productos y añadir categorías: en la app, Ajustes › Catálogo › «Organizar» (arrastra los ladrillos entre categorías, ✕ para quitar). En la hoja, poner `FALSE` en `activo`.
- Los logos disponibles para la columna `logo` de Supers: `mercadona`, `lidl`, `aldi`, `alimerka`, `froiz`, `gadis`, `elcorte`.

## Actualizar a una versión nueva

Pega los nuevos `Code.gs` e `Index.html` y luego **Implementar › Gestionar implementaciones** › lápiz › Versión: **Nueva versión** › Implementar. La URL no cambia.

## Para quien programe

`app.js` y `style.css` son la app. `python3 build.py` genera `backend/Index.html` con todo dentro. Abriendo `index.html` fuera de Google (por ejemplo en GitHub Pages) la app funciona en modo prueba, guardando solo en el móvil.

## Pensado para más adelante

- **Menús**: otra pestaña en la misma hoja.
- **Google Chat**: un webhook del espacio de la familia en Config para recibir avisos.
- **Cuándo hará falta**: con la pestaña Historial.
