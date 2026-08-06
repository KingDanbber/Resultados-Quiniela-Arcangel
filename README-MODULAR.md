# Quiniela Arcángel — Estructura modular

Esqueleto listo para migrar desde el `index.html` monolítico.

## Estructura

```
quiniela-arcangel/
├── index.html                 # Solo esqueleto + links
├── css/
│   ├── variables.css          # Temas (dark / light / estadio)
│   ├── base.css               # Reset, tipografía, animaciones
│   ├── layout.css             # Header, main, bottom-nav, views
│   └── components.css         # Cards, chips, tabla, historial…
├── js/
│   ├── utils.js
│   ├── data.js                # ← Migra aquí jornadas / resultados / standings
│   ├── app.js                 # Navegación
│   └── render/
│       ├── home.js
│       ├── jornadas.js
│       ├── historial.js
│       ├── ganadores.js
│       └── tabla.js
├── img/                       # Copia tus logos desde el repo actual
├── manifest.json              # Copia el actual
└── sw.js                      # Actualiza cache con los nuevos paths
```

## Cómo migrar paso a paso

1. **Copia** esta carpeta junto a tu repo (o reemplaza archivos).
2. **Copia** `img/`, `manifest.json` y `sw.js` del proyecto actual.
3. Actualiza `sw.js` para cachear:
   - `css/*.css`
   - `js/*.js` y `js/render/*.js`
4. Abre `index.html` en local o despliega en Vercel.
5. Ve moviendo la lógica real:
   - Datos de jornadas / boletas → `js/data.js`
   - Podio y leaderboard → `js/render/ganadores.js` + detalle de jornada
   - Partidos en vivo → nueva vista `jornada-detalle` (reutiliza tus cards actuales)
6. Cuando una vista esté lista, elimina el código equivalente del HTML viejo.

## Navegación

- Bottom nav (móvil): Inicio · Jornadas · Historial · Ganadores · Tabla
- Query `?tab=tabla` funciona
- Desktop: el bottom nav se oculta (puedes añadir top tabs después)

## Tabla Liga MX

- Stub en `data.getStandings()`
- Reemplaza por JSON propio, cálculo desde resultados o proxy a API
- Mini-tabla en Inicio + vista completa en **Tabla**

## Notas

- Sin bundler: scripts en orden en el HTML.
- Namespace global `QA` para evitar colisiones.
- Mismo tema visual (variables CSS idénticas a tu app actual).
