# vigIA

Monorepo Nx con npm workspaces. La aplicación NestJS está en `apps/api`.

## Inicio local

Con Node.js 26 y npm, ejecuta desde la raíz del monorepo:

```bash
npm ci
npx nx build @vigia/api
npx nx start @vigia/api
```

La API escucha en `http://localhost:3000`. Puedes cambiar el puerto con la variable de entorno `PORT`.

## PostgreSQL

Copia `.env.example` a `.env` y asigna una contraseña local a `POSTGRES_PASSWORD`. Si contiene `$`, conserva las comillas simples para que Compose la lea literalmente. PostgreSQL 17 escucha en `127.0.0.1:55432` por defecto y guarda sus datos en un volumen de Compose. Puedes cambiar el puerto con `POSTGRES_PORT`.

```bash
docker compose up -d --wait db
npm run db:migrate
```

La migración inicial crea el esquema y carga las cinco categorías de incidentes. Puedes aplicar las migraciones pendientes con el mismo comando.

Si usas Podman con el proveedor `podman-compose` instalado, puedes sustituir `docker compose` por `PODMAN_COMPOSE_PROVIDER=podman-compose podman compose`.

El esquema de Drizzle está en `apps/api/src/database/schema.ts` y las migraciones en `apps/api/drizzle`. Después de editar el esquema, ejecuta `npm run db:generate -- --name=describe_change`, revisa el SQL generado y aplica la migración con `npm run db:migrate`.

Puedes apuntar a otra base PostgreSQL con `DATABASE_URL`. Para la primera migración, usa una base vacía con `public` como esquema predeterminado.

Puedes verificar las restricciones, las categorías iniciales y las vistas en una base recién migrada.

```bash
docker compose exec -T db psql -X -v ON_ERROR_STOP=1 -U vigia -d vigia < apps/api/test/database.test.sql
```
