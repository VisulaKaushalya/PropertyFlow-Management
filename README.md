# PropManager

PropManager is a React/Vite property management application for managing properties, rooms, tenants, rent payments, documents, tasks, and the monthly calendar.

## Technology

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Wouter
- **UI:** Radix UI primitives, Lucide icons, Framer Motion
- **Data fetching:** TanStack Query
- **API:** Express 5, TypeScript, OpenAPI-first route contracts
- **Database:** PostgreSQL with Drizzle ORM
- **Generated clients:** Orval-generated React Query hooks and Zod schemas
- **Package manager:** pnpm
- **Runtime:** Node.js 20+ recommended

## Requirements for a local laptop

Install:

1. Node.js 20 or newer
2. pnpm 9 or newer (`corepack enable` can enable the pnpm version manager)
3. PostgreSQL 14 or newer
4. Git

## Setup

```bash
git clone <your-github-repository-url>
cd <repository-directory>
corepack enable
pnpm install
```

Create a local PostgreSQL database, then set the connection string:

```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/propmanager"
```

On Windows PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/propmanager"
```

Apply the schema:

```bash
pnpm --filter @workspace/db run push
```

## Run locally

The project has two services. Open two terminals from the repository root.

Terminal 1 — API server:

```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/propmanager"
export PORT=8080
pnpm --filter @workspace/api-server run dev
```

Terminal 2 — frontend:

```bash
export PORT=5173
export BASE_PATH=/
pnpm --filter @workspace/property-mgmt run dev
```

Open `http://localhost:5173`.

The frontend calls the API at `/api`. Vite proxies that path to `http://localhost:8080` by default. If you run the API elsewhere, set `API_URL` before starting the frontend:

```bash
export API_URL="http://localhost:8080"
```

In Replit, the artifact routing already provides this connection.

## Generate API clients after changing OpenAPI

Edit `lib/api-spec/openapi.yaml`, then run:

```bash
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
```

The generated files are in `lib/api-client-react` and `lib/api-zod`.

## Useful commands

```bash
pnpm run typecheck
pnpm --filter @workspace/property-mgmt run build
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/db run push
```

## Data and uploads

- PostgreSQL stores properties, rooms, tenants, payments, documents, and tasks.
- Uploaded documents and payment evidence are stored by the API in its `uploads/` directory.
- Do not commit local database credentials, `.env` files, or uploaded private documents.
- The application currently has no authentication layer, so run it only on a trusted local network until authentication is added.

## Main routes

- `/` — dashboard
- `/properties` — property management
- `/tenants` — tenant management and quick payment
- `/payments` — payment history and payment logging
- `/documents` — document records and device uploads
- `/tasks` — task management
- `/calendar` — monthly calendar, rent collection, repairs, appointments, and task links
- `/search` — global search