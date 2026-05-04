# Kubstorm Setup Guide

## Quick Start

### 1. Database Setup

Before running the app, you need to set up a PostgreSQL database.

#### Option A: Local PostgreSQL (macOS with Homebrew)
```bash
# Install PostgreSQL
brew install postgresql

# Start the server
brew services start postgresql

# Create a database
createdb kubstorm

# Update .env.local with your connection string
DATABASE_URL="postgresql://localhost/kubstorm"
```

#### Option B: Use Prisma's Hosted Database
```bash
npx create-db
# This creates a free Prisma Postgres database and updates .env.local
```

### 2. Run Migrations

Once your database is configured:

```bash
npx prisma migrate dev --name init
```

This creates the User and Cluster tables.

### 3. Create a Test User (Optional)

```bash
npx tsx scripts/create-user.ts
# Email: test@example.com
# Password: password123
```

Or use the app's login to create a user naturally.

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Required `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - JWT secret (generate: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - http://localhost:3000 (for dev)
- `ENCRYPTION_KEY` - AES-256 encryption key for kubeconfigs

---

## Features (Phase 1-2)

✅ User authentication (email/password)
✅ Cluster management UI
✅ Add/remove clusters (encrypted kubeconfig storage)
✅ Dark theme with lime accent colors

Coming Next:
- Kubernetes API integration (pods, deployments, services)
- Real-time logs with SSE
- CPU/Memory metrics
- CRUD operations on K8s resources

---

## Testing

### Add a Cluster
1. Login to http://localhost:3000
2. Click "+ Add Cluster"
3. Upload a kubeconfig file (or test with a dummy YAML)
4. Cluster appears on dashboard

### Delete a Cluster
Click "Delete Cluster" on a cluster card (requires confirmation)

---

## Notes

- Kubeconfigs are encrypted at rest with AES-256-GCM
- All API routes require authentication
- Cluster deletion cascades in database
