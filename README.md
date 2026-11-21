# Ritmo CACO

Web app para entrenamientos de carrera por intervalos. Pegas el mensaje del entrenador (WhatsApp), lo convierte en intervalos editables y te guía por voz en español por los auriculares: el intervalo que empieza, el esfuerzo, cuántos quedan y un aviso antes del siguiente.

- Funciona sin servidor: los entrenamientos se guardan en el navegador del móvil.
- Series por distancia con GPS (o tiempo estimado según tu ritmo).
- Instalable en Android: abre la web en Chrome → menú → "Añadir a pantalla de inicio".

## Desarrollo

El código está en `src/`. `python3 build.py` (desde `src/`) genera `standalone/index.html`, que se copia a la raíz.

## Cesta (lista de la compra familiar)

En `cesta/` hay otra app independiente: la lista de la compra compartida por familias, con Google Sheets de backend. Ver `cesta/LEEME.md`.
