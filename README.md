# ViraxStudio

ViraxStudio automatise une chaine YouTube de A a Z depuis une seule application: login owner, coffre-fort de secrets chiffres, generation de scripts, assets, voix off, rendu video, upload prive, review et publication YouTube.

Site web: https://viraxstudio.levelingcoder.com

## Monorepo
- `apps/web`: front React 18 + Vite
- `apps/api`: API Fastify + OAuth Google + session owner + gestion des integrations
- `apps/worker`: BullMQ worker + scheduler + pipeline de production
- `packages/shared`: contrats Zod, schema Drizzle, chiffrement et logique partagee

## Stack principale
- Front: React, React Router, Vite
- Backend: Node.js, TypeScript, Fastify
- Orchestration: BullMQ, Redis
- Data: PostgreSQL, Drizzle ORM
- Media: S3-compatible storage, FFmpeg
- Providers initiaux: Anthropic, ElevenLabs, YouTube, Pexels fallback

## Securite
- Tous les secrets et refresh tokens sont chiffres au repos avec AES-256-GCM.
- Le navigateur ne conserve plus les cles API comme source de verite.
- `virax_config` sert uniquement aux preferences UI et a la migration legacy.
- La session owner passe par cookie `httpOnly` et Google OAuth cote backend.

## Demarrage local
1. Copier `.env.example` vers `.env` et renseigner les variables.
2. Installer les dependances avec `npm ci`.
3. Generer la migration avec `npm run db:generate` puis appliquer `npm run db:migrate`.
4. Lancer les services:
   - `npm run dev:api`
   - `npm run dev:worker`
   - `npm run dev:web`

## Build
- `npm run build`
- `npm run test`

## Deploiement
- Le workflow GitHub Actions publie uniquement `apps/web/dist` sur o2switch.
- Le backend et le worker sont prevus pour etre deployes sur Railway avec PostgreSQL + Redis et un bucket S3-compatible.
- Secret GitHub Actions requis pour le build web:
  - `VITE_API_BASE_URL`
  - `FTP_SERVER`
  - `FTP_USERNAME`
  - `FTP_PASSWORD`
  - `FTP_SERVER_DIR`
