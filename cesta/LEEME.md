# Cesta: puesta en marcha

Cesta es la lista de la compra de la familia. La app vive en GitHub Pages y los datos en Google Sheets:

- **Hoja «Cesta · Registro»**: qué familias hay, qué correos entran en cada una y las sesiones abiertas. Lleva pegado el programa `backend/Code.gs`.
- **Una hoja de cálculo por familia** («Cesta · Casa …»): pestañas Categorias, Productos, Personas, Supers, Lista e Historial. La crea la app al pulsar «Crear familia» y la comparte con cada miembro, así que se puede editar a mano.

Hasta que hagas estos pasos, la app funciona en **modo prueba**: todo se guarda solo en el móvil.

> Usa una cuenta de **Gmail personal** para todos los pasos. Las cuentas de colegio o empresa suelen tener bloqueado compartir con Gmail de fuera y publicar aplicaciones web para «cualquier usuario».

## 1. Crear el ID de cliente de Google (10 minutos, una vez)

1. Entra en <https://console.cloud.google.com/> y crea un proyecto llamado `Cesta`.
2. Menú **Google Auth Platform** (o «APIs y servicios» › «Pantalla de consentimiento de OAuth»):
   - Tipo de usuario: **Externo**. Nombre de la app: `Cesta`. Pon tu correo donde lo pida.
   - En **Público**, pulsa **Publicar aplicación** para que tus amigos puedan entrar. Como solo pide nombre y correo, Google no exige revisión.
3. **Clientes** (o «Credenciales») › **Crear cliente** › tipo **Aplicación web**.
   - Orígenes de JavaScript autorizados: `https://antuanet71.github.io`
   - Guarda y copia el **ID de cliente** (termina en `.apps.googleusercontent.com`).

## 2. Publicar el backend (10 minutos, una vez)

1. Abre la hoja **Cesta · Registro** (o crea una hoja nueva con ese nombre).
2. **Extensiones › Apps Script**. Borra lo que haya y pega todo el contenido de `backend/Code.gs`.
3. En la línea `const CLIENT_ID = '…'` pega tu ID de cliente. Guarda (icono del disquete).
4. Arriba, elige la función **preparar** y pulsa **Ejecutar**. Acepta los permisos. Si sale «Google no ha verificado esta aplicación», pulsa «Configuración avanzada» › «Ir a Cesta». Es tu propio programa.
5. **Implementar › Nueva implementación** › tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   - Copia la **URL de la aplicación web** (termina en `/exec`).

## 3. Conectar la app

Edita `cesta/config.js` y pega las dos direcciones:

```js
window.CESTA_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/…/exec',
  clientId: '…apps.googleusercontent.com'
};
```

(O pásaselas a Claude y lo hace él.)

## Uso

- Abre `https://antuanet71.github.io/ritmo-caco/cesta/` en el móvil y entra con Google.
- **Crear familia**: crea su hoja con el catálogo de ejemplo. En Ajustes verás el **código para invitar**.
- Los demás entran con su Gmail y escriben ese código en «Unirme con un código».
- Para instalarla: Android, menú de Chrome › «Añadir a pantalla de inicio». iPhone, Safari › Compartir › «Añadir a pantalla de inicio».

En la app: un toque añade, cada toque más suma uno, y con doble toque (o manteniendo pulsado) eliges persona, súper y cantidad. En la Lista, al tocar se tacha y vuelve al catálogo. Lo tachado desaparece de la lista al día siguiente y queda guardado con fecha en la pestaña Historial.

## Editar a mano en la hoja

- Puedes añadir filas en **Productos** escribiendo solo el nombre, la categoría y el súper **por su nombre** (por ejemplo `Champú`, `Higiene`, `Mercadona`). La app completa el resto la próxima vez que se abra.
- Para ocultar un producto, pon `FALSE` en la columna `activo`.
- Puedes cambiar nombres y colores de categorías en **Categorias**.

## Si cambias Code.gs más adelante

**Implementar › Gestionar implementaciones** › lápiz › Versión: **Nueva versión** › Implementar. Así la URL no cambia.

## Pensado para más adelante

- **Menús**: será otra pestaña en la misma hoja de cada familia.
- **Google Chat**: cada familia podrá poner el webhook de su espacio para recibir avisos («Marta ha añadido leche»).
- **Cuándo hará falta**: la pestaña Historial ya guarda cada compra con fecha.
