# Web Push · configuración Vercel + Supabase

## 1. Tablas en Supabase
Ejecuta `sql/push_tables.sql` en el SQL Editor.

## 2. Generar claves VAPID
```bash
npx web-push generate-vapid-keys
```

## 3. Variables en Vercel (Project → Settings → Environment Variables)
| Variable | Valor |
|----------|--------|
| `VAPID_PUBLIC_KEY` | clave pública |
| `VAPID_PRIVATE_KEY` | clave privada |
| `VAPID_SUBJECT` | `mailto:tu@email.com` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (recomendado) |
| `CRON_SECRET` | string aleatorio (opcional pero recomendado) |

## 4. Cron
`vercel.json` llama a `/api/push-check` cada 2 minutos.
Si defines `CRON_SECRET`, configura el cron con header o usa:
`/api/push-check?secret=TU_SECRET`

Nota: Cron de Vercel en plan Hobby tiene límites; el path sigue pudiendo llamarse manualmente.

## 5. Deploy
```bash
npm install
vercel --prod
```

## 6. Probar
1. Abre la app en HTTPS (Vercel).
2. Toca la campana → aceptar permiso.
3. Fuerza un check: `curl https://tu-dominio.vercel.app/api/push-check?secret=...`
