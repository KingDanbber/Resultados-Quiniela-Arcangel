# Resultados Quiniela Arcángel®

Aplicación web progresiva (PWA) para consultar **en vivo** los resultados de la Quiniela Arcángel: jornadas Sencilla y Campeón de Goleo, clasificación, historial, estadísticas y más.

**Pasión x Ganar**

---

## Características

### Jornadas y resultados
- Listado de jornadas **activas**, borrador y finalizadas
- Detalle por jornada: partidos, marcadores, bolsa y progreso
- Modo **Sencilla** (1X2 por partido) y **Campeón de Goleo** (pronóstico de goles totales)
- Clasificación en vivo con búsqueda de participantes
- **Mi boleta** destacada y comparación de 2 boletas
- Resumen al cerrar jornada (podio, bolsa, compartir) y sección de últimas jornadas en Inicio

### Rankings y estadísticas
- Salón de la Fama, Campeón de Goleo y estadísticas globales
- Historial con pestañas Resumen / Participantes (A–Z + ficha detalle)
- Tabla Liga MX (clasificación y calendario)
- Sugerencias inteligentes (estadísticas locales: consenso del grupo + tabla)

### Experiencia de uso
- Diseño responsive (móvil primero) con **9 temas** (oscuro, claro, oro, medianoche, estadio, carbon, Liga MX, neón, alto contraste)
- Skeleton loaders, animaciones de posición y pull-to-refresh
- Notificaciones in-app (toasts) al publicar resultados
- Mini reproductor de música con lista y controles
- Reglas / términos, crédito del desarrollador e instalación como PWA

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | HTML5, CSS3, JavaScript (vanilla) |
| Datos | [Supabase](https://supabase.com/) (PostgreSQL + API REST) |
| Hosting | [Vercel](https://vercel.com/) (estático) |
| App | PWA (`manifest`, service worker) |
| Tabla externa | ESPN API (standings Liga MX, solo lectura) |

No usa frameworks pesados: carga rápida y fácil de mantener.

---

## Estructura del repositorio

```
├── index.html              # Shell de la app
├── css/
│   ├── variables.css       # Temas y tokens de diseño
│   ├── base.css
│   ├── layout.css
│   └── components.css
├── js/
│   ├── data.js             # Cliente Supabase y lógica de negocio
│   ├── app.js              # Navegación y vistas
│   ├── theme.js            # Selector de temas
│   ├── music-player.js     # Reproductor de audio
│   ├── notifications.js    # Toasts de resultados
│   ├── resumen.js, reglas.js, compare.js, my-boleta.js, …
│   └── render/             # Vistas (home, jornadas, detalle, etc.)
├── img/                    # Logos de equipos y de la app
├── audio/                  # Pistas MP3 del reproductor
├── manifest.json
├── sw.js                   # Service worker
└── vercel.json
```

---

## Datos (Supabase)

Tablas principales (nombres orientativos):

- `pools` — jornadas (modo, estado, precio, competencia, temporada)
- `matches` — partidos y marcadores
- `entries` — boletas / participantes por jornada
- `participants` — catálogo de jugadores
- `predictions_1x2` — picks Local / Empate / Visitante
- `predictions_goals_total` — pronóstico de goles (Goleo)
- `pool_results` — bolsa bruta / neta y resultados oficiales

La app es **solo lectura** respecto a la organización de la quiniela: el organizador carga datos en Supabase; los usuarios consultan resultados.

---

## Desarrollo local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/KingDanbber/Resultados-Quiniela-Arcangel.git
   cd Resultados-Quiniela-Arcangel
   ```
2. Sirve la carpeta con cualquier servidor estático, por ejemplo:
   ```bash
   npx serve .
   # o: python -m http.server 5500
   ```
3. Abre la URL local en el navegador.

> Las claves/URL de Supabase deben estar configuradas en `js/data.js` (o el módulo de config que uses). No subas secretos de escritura si el rol de la app es solo lectura pública.

---

## Despliegue en Vercel

1. Importa el repo en [Vercel](https://vercel.com/).
2. Framework preset: **Other** (sitio estático).
3. Build: no requiere comando de build; publica la raíz del proyecto.
4. Cada push a `main` genera un nuevo deploy.

Dominio de producción (ejemplo): el que asigne Vercel o tu dominio personalizado.

---

## PWA

- Instalable desde el navegador (Android / escritorio).
- Iconos y `theme-color` en `manifest` / meta tags.
- Caché vía service worker para uso con red inestable (según configuración actual de `sw.js`).

---

## Música de fondo

Carpeta `audio/` con pistas opcionales. El reproductor está apagado por defecto (requiere gesto del usuario por políticas del navegador).

Nombres de ejemplo en el código:

- `01 Sábado a las cuatro - Quiniela Arcángel.mp3`
- `02 Final Tally.mp3`
- `03 After The Final Whistle.mp3`
- `04 Two Minute Drill.mp3`

---

## Temas

El icono de paleta abre un selector. La preferencia se guarda en `localStorage` (`qa_theme`):

Oscuro · Claro · Oro Arcángel · Medianoche · Estadio · Carbon · Liga MX · Neón · Alto contraste

---

## Aviso legal / uso

Quiniela Arcángel es una **actividad recreativa entre conocidos**, sin fines de lucro comercial. Esta app solo muestra resultados y estadísticas; no opera apuestas ni procesa pagos en línea.

Los marcadores oficiales son los del tiempo reglamentario, salvo indicación del organizador.

---

## Créditos

**Resultados Quiniela Arcángel®**  
Desarrollado por **Luis Arturo**  
con ayuda de Inteligencia Artificial: Grok (xAI) · ChatGPT (OpenAI) · Claude (Anthropic)

---

## Licencia

Uso interno del grupo de la Quiniela Arcángel.  
Consulta con el autor antes de redistribuir o reutilizar el código en otro proyecto.
