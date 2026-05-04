# 📋 Kubstorm - Resumo Técnico

**Kubstorm** é uma ferramenta de gerenciamento de clusters Kubernetes com interface desktop multiplataforma. Uma aplicação de código aberto para monitorar, gerenciar e administrar recursos Kubernetes de forma intuitiva.

---

## 🏗️ Arquitetura Geral

```
┌─────────────────────────────────────────┐
│          Aplicação Desktop              │
│    (Electron + Next.js Frontend)        │
├─────────────────────────────────────────┤
│         Backend API (Next.js)           │
│   API Routes + Kubernetes Integration   │
├─────────────────────────────────────────┤
│         Banco de Dados                  │
│  PostgreSQL + Prisma ORM                │
├─────────────────────────────────────────┤
│         Clusters Kubernetes             │
│     (Via kubectl + Kubeconfig)          │
└─────────────────────────────────────────┘
```

---

## 💾 Linguagens & Plataformas

| Aspecto | Tecnologia |
|--------|-----------|
| **Frontend** | TypeScript + React 19.2.4 |
| **Backend** | TypeScript + Node.js (Next.js 16) |
| **Desktop** | Electron 41.5.0 (Multiplataforma) |
| **Styling** | Tailwind CSS 4 + CSS em React |
| **Database** | PostgreSQL |
| **ORM** | Prisma 7.8.0 |
| **Autenticação** | NextAuth.js 4.24.14 |

---

## 🗄️ Banco de Dados

### Provedor
- **PostgreSQL** (recomendado para produção)
- Configurado via Prisma Data Source

### Modelos (Schema)

#### User
```
- id (CUID, PK)
- email (unique)
- name
- password (bcrypt)
- role (default: "user")
- ownedClusters (relation)
- clusterAccess (relation)
- createdAt, updatedAt
```

#### Cluster
```
- id (CUID, PK)
- name
- provider (generic | gke | eks | aks)
- kubeconfigEnc (encrypted)
- serverUrl
- saToken (service account token)
- gcpProjectId
- k8sClusterName
- userId (FK → User)
- userAccess (relation)
- createdAt, updatedAt, lastConnected
```

#### ClusterAccess
```
- id (CUID, PK)
- userId (FK → User)
- clusterId (FK → Cluster)
- unique constraint: [userId, clusterId]
- createdAt
```

**Total de Tabelas:** 3 (+ tabelas internas do NextAuth)

---

## 📦 Stack Frontend

### Framework & Rendering
- **Next.js 16.2.4** - Full-stack React framework com App Router
- **React 19.2.4** - UI library
- **Turbopack** - Build bundler (default Next.js 16)

### UI & Styling
- **Tailwind CSS 4** - Utility-first CSS
- **Shadcn/ui 0.9.5** - Headless component library
- **Base UI React 1.4.1** - Unstyled, accessible components
- **Lucide React 1.14.0** - Icon library
- **Recharts 3.8.1** - Data visualization charts
- **CVA (Class Variance Authority)** - Utility for building component variants

### State Management
- **Zustand 5.0.12** - Lightweight state management
- **NextAuth.js** - Session management

### Terminal Emulation
- **xterm.js 5.3.0** - Terminal emulator (para shell interativo)
- **xterm-addon-fit** - Addon para auto-resize

### Utilities
- **clsx 2.1.1** - Conditional className utility
- **tailwind-merge** - Merge Tailwind CSS classes

---

## 🔧 Stack Backend

### Framework & Runtime
- **Next.js 16.2.4** - API Routes (serverless functions)
- **Node.js 20+** (via Next.js)
- **TypeScript 5** - Type safety

### Authentication & Security
- **NextAuth.js 4.24.14** - OAuth, credenciais, JWT
- **bcryptjs 3.0.3** - Password hashing
- **Crypto nativo** - Encriptação de kubeconfig

### Banco de Dados
- **Prisma 7.8.0** - ORM
- **@prisma/adapter-pg** - Adapter PostgreSQL
- **@prisma/client** - Client Prisma gerado

### Kubernetes Integration
- **@kubernetes/client-node 1.4.0** - Official Kubernetes JS client
- **kubectl (CLI)** - Executado via child_process para comandos

### Google Cloud
- **@google-cloud/monitoring 5.3.2** - Google Cloud Monitoring API
- Fallback para `kubectl top` se Metrics Server não disponível

### Utilities
- **js-yaml 4.1.1** - YAML parsing (kubeconfig parsing)

---

## 🖥️ Stack Desktop (Electron)

### Framework
- **Electron 41.5.0** - Cross-platform desktop app
- **electron-builder 26.8.1** - Build & package installers

### Build & Development
- **concurrently 9.2.1** - Run multiple commands
- **wait-on 9.0.5** - Wait for dev server startup

### Distribuição
Suporta build e instaladores para:

#### Windows
- NSIS Installer (.exe com wizard)
- Portable executable (.exe sem instalação)
- Tamanho: ~200-250MB

#### macOS
- DMG Installer (.dmg)
- ZIP Archive (.zip)
- Tamanho: ~250-300MB

#### Linux
- AppImage (.AppImage)
- Debian package (.deb)
- Tamanho: ~180-220MB

---

## 📁 Estrutura do Projeto

```
kubstorm/
├── app/                           # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup)
│   ├── (dashboard)/              # Protected dashboard pages
│   │   ├── clusters/             # Cluster management
│   │   ├── settings/             # Settings pages
│   │   └── search/               # Search functionality
│   └── api/                      # API Routes
│       ├── auth/                 # NextAuth.js routes
│       ├── clusters/             # Cluster endpoints
│       │   ├── [clusterId]/      # Dynamic cluster endpoints
│       │   │   ├── logs/         # Pod logs streaming (SSE)
│       │   │   ├── metrics/      # CPU/Memory metrics
│       │   │   ├── pods/         # Pod management
│       │   │   ├── nodes/        # Node info
│       │   │   ├── certificates/ # TLS certificates
│       │   │   └── ...           # Other K8s resources
│       ├── users/                # User management
│       └── settings/             # Settings API
├── components/                    # React Components
│   ├── k8s/                      # Kubernetes UI components
│   ├── metrics/                  # Metrics & charts
│   ├── layout/                   # Layout components
│   ├── ui/                       # Base UI components
│   └── ...                       # Other component groups
├── lib/                          # Utilities & helpers
│   ├── k8s/                      # Kubernetes operations
│   │   ├── pods.ts              # Pod queries & logs
│   │   ├── nodes.ts             # Node queries
│   │   ├── deployments.ts       # Deployment queries
│   │   ├── metrics.ts           # Metrics fetching
│   │   ├── certificates.ts      # TLS cert queries
│   │   └── ...                  # Other K8s resources
│   ├── auth.ts                  # NextAuth config
│   ├── permissions.ts           # Authorization checks
│   ├── crypto.ts                # Kubeconfig encryption
│   ├── db/                      # Database queries
│   └── ...                      # Other utilities
├── electron/                     # Electron main process
│   ├── main.js                  # Main process entry
│   └── preload.js               # Security context bridge
├── prisma/                      # Database schema
│   └── schema.prisma            # Prisma models
├── public/                      # Static files
└── package.json                 # Dependencies
```

---

## 🔌 API Endpoints Principais

### Autenticação
- `POST /api/auth/signin` - Login
- `POST /api/auth/signup` - Sign up
- `GET /api/auth/session` - Get session

### Clusters
- `GET /api/clusters` - List clusters
- `POST /api/clusters` - Create cluster
- `GET /api/clusters/[clusterId]` - Get cluster details
- `DELETE /api/clusters/[clusterId]` - Delete cluster

### Kubernetes Resources
- `GET /api/clusters/[clusterId]/pods` - List pods
- `GET /api/clusters/[clusterId]/pods/shell` - Interactive pod shell
- `GET /api/clusters/[clusterId]/logs` - Stream pod logs (SSE)
- `GET /api/clusters/[clusterId]/nodes` - List nodes
- `GET /api/clusters/[clusterId]/deployments` - List deployments
- `GET /api/clusters/[clusterId]/services` - List services
- `GET /api/clusters/[clusterId]/ingresses` - List ingresses
- `GET /api/clusters/[clusterId]/metrics/resources` - Node metrics
- `GET /api/clusters/[clusterId]/metrics/gcp` - GCP metrics
- `GET /api/clusters/[clusterId]/certificates` - TLS certificates
- `GET /api/clusters/[clusterId]/events` - Cluster events

### Settings
- `GET /api/settings/import-kubeconfig` - Import kubeconfig
- `POST /api/clusters/[clusterId]/namespace-manager` - Manage namespaces

---

## 🚀 Recursos Principais

### ✅ Funcionalidades Implementadas

1. **Dashboard Overview**
   - Total de nodes, pods, deployments, namespaces
   - Status de pods (Running, Pending, Failed)
   - Health status de deployments
   - Status de nodes
   - Filtro por namespace
   - Métricas de CPU/Memória
   - Versão do Kubernetes
   - Status de problemas
   - Certificados TLS
   - Última sincronização

2. **Gerenciamento de Pods**
   - Listar pods (com filtros)
   - Ver logs em tempo real (streaming via SSE)
   - Shell interativo com xterm.js
   - Editar/deletar pods

3. **Gerenciamento de Clusters**
   - Adicionar clusters via kubeconfig
   - Compartilhar clusters com outros usuários
   - Multi-cluster support

4. **Autenticação & Autorização**
   - Login/signup local
   - NextAuth.js com JWT
   - Controle de acesso por cluster
   - Admin panel para gerenciar usuários

5. **Terminal Interativo**
   - Shell em pods
   - Terminal emulator com xterm.js
   - Suporta interação em tempo real

6. **Aplicação Desktop**
   - Interface desktop via Electron
   - Instaladores para Windows, macOS, Linux
   - Modo desenvolvimento com DevTools
   - Standalone bundles

---

## 🛠️ Development & Build

### Scripts Disponíveis

```bash
npm run dev              # Inicia servidor Next.js em dev
npm run build            # Build para produção
npm run start            # Inicia servidor em produção
npm run lint             # ESLint verificação
npm run electron-dev     # Inicia Electron em dev
npm run electron-build   # Build Electron para todas plataformas
npm run electron-pack    # Package Electron (sem instalador)
npm run electron         # Executa Electron standalone
```

### Variáveis de Ambiente

```env
DATABASE_URL=             # PostgreSQL connection string
NEXTAUTH_SECRET=          # JWT signing secret
NEXTAUTH_URL=             # Base URL para autenticação
GCP_PROJECT_ID=           # (Opcional) Google Cloud Project
GOOGLE_CLOUD_CREDENTIALS= # (Opcional) GCP service account JSON
```

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| **Dependências** | ~50 packages |
| **DevDependencies** | ~20 packages |
| **Database Tables** | 3 (User, Cluster, ClusterAccess) + NextAuth |
| **API Routes** | 30+ endpoints |
| **React Components** | 40+ components |
| **Supported Platforms** | Windows, macOS, Linux |
| **Min App Size** | ~180MB (Linux) |

---

## 🔐 Segurança

1. **Context Isolation (Electron)** - nodeIntegration disabled
2. **Preload Script** - Safe IPC bridge
3. **Password Hashing** - bcryptjs
4. **Kubeconfig Encryption** - AES-256 (crypto nativo)
5. **JWT Sessions** - NextAuth.js
6. **RBAC** - Role-based access control
7. **CORS** - Next.js built-in

---

## 🎯 Próximas Melhorias (Planned)

- [ ] Auto-update via electron-updater
- [ ] Notificações nativas do sistema
- [ ] Tray icon (rodar em background)
- [ ] Sincronização de dados com nuvem
- [ ] Dark mode / Light mode toggle
- [ ] Backup/restore de configurações
- [ ] Helm integration
- [ ] GitOps integration

---

## 📝 Resumo Técnico

**Kubstorm** é uma aplicação fullstack moderna construída com:
- **TypeScript end-to-end** para type-safety
- **React + Next.js** para frontend/backend
- **PostgreSQL + Prisma** para dados persistentes
- **Electron** para desktop multiplataforma
- **Kubernetes Client Node** para integração nativa
- **Real-time streaming** de logs via SSE
- **Security-first** com encriptação e RBAC

É uma solução completa para gerenciar Kubernetes clusters com uma interface intuitiva, disponível como aplicação web ou desktop instalável.
