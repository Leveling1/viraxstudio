# AGENTS.md

## Mission produit
- ViraxStudio est maintenant un monorepo full-stack pour automatiser une chaine YouTube de A a Z sans quitter l'application.
- Le flux cible: login owner Google, coffre-fort de secrets, creation de run, generation IA, assets, voix, rendu, upload YouTube prive, review editoriale, puis publication ou programmation.
- Le projet est mono-owner pour cette phase. Toute decision produit et securite doit preserver ce mode de fonctionnement.

## Architecture du depot
- `apps/web`: front React/Vite. L'application parle uniquement a l'API backend; elle ne doit plus appeler Anthropic, ElevenLabs ou YouTube directement.
- `apps/api`: API Fastify. Gere l'auth owner, les integrations, les profils pipeline, les runs, la review et les demandes de publication.
- `apps/worker`: worker BullMQ + scheduler. Gere les jobs longs, le rendu FFmpeg, l'upload prive et la publication YouTube.
- `packages/shared`: schema Drizzle, contrats Zod, utilitaires de chiffrement et logique de pipeline partagee.

## Invariants critiques
- Ne pas casser la cle `localStorage` `virax_config`, mais ne l'utiliser que pour des preferences UI et la migration legacy. Ne pas y reintroduire de secret comme source de verite.
- Ne pas renvoyer une cle API ou un refresh token en clair au front. Les reponses UI ne doivent exposer que des statuts, masques, IDs ou metadata non sensibles.
- Preserver les routes web:
  - `/`
  - `/channel`
  - `/script`
  - `/video`
  - `/publish`
  - `/settings`
- Preserver les endpoints backend versionnes sous `/api/v1`.
- Garder le workflow web compatible avec `npm ci` puis `npm run build`.

## Securite a respecter
- Le chiffrement at-rest passe par `APP_ENCRYPTION_KEY` et `packages/shared/src/server/encryption.ts`.
- Toute nouvelle integration se stocke dans `integrations` + `integration_secrets`, jamais dans le navigateur.
- L'auth owner doit verifier `OWNER_GOOGLE_EMAIL` seulement si cette variable est definie; sinon le premier compte YouTube connecte devient l'owner de reference cote serveur.
- Les cookies de session restent `httpOnly`; ne pas basculer la session vers `localStorage`.
- Ne jamais commit de secret, token, dump DB ou media genere reel.

## Workflow de modification recommande
1. Lire d'abord `apps/web/src/App.jsx`, `apps/api/src/app.ts`, `apps/worker/src/index.ts` et le schema partage pour comprendre le flux complet.
2. Si un changement touche un contrat front/back, modifier d'abord `packages/shared/src/contracts/*` puis aligner API et front.
3. Si un changement touche la persistence, modifier `packages/shared/src/db/schema.ts` puis regenerer les migrations.
4. Si un changement touche le pipeline, verifier les impacts API, worker, review et publication ensemble.
5. Garder le responsive complet du front. Toute nouvelle vue doit fonctionner sur mobile, tablette et desktop.

## Conventions de code
- Preferer des composants et fonctions simples, lisibles, testables.
- Reutiliser les contrats Zod partages plutot que du JSON ad hoc.
- Cote worker, preferer des etapes de pipeline idempotentes ou reset explicite avant regeneration.
- Cote web, centraliser les appels backend dans `apps/web/src/lib/api.js`.
- Cote API, maintenir une separation claire routes / services / lib / db.
- Cote worker, maintenir une separation claire jobs / providers / services / lib.

## Zones sensibles
- `apps/api/src/lib/google.ts` et `apps/worker/src/lib/google.ts`: flux OAuth / refresh token.
- `packages/shared/src/server/encryption.ts`: chiffrement et hash.
- `apps/worker/src/services/pipeline.ts`: orchestration complete d'un run.
- `apps/web/src/pages/Settings.jsx`: migration legacy et configuration des integrations.
- `.github/workflows/deploy.yml`: ne deploie que le web statique; ne pas casser le chemin `apps/web/dist`.

## Checklist avant push
- `npm ci`
- `npm run build`
- `npm run test`
- verifier qu'aucune cle sensible n'est exposee au front
- verifier que le front reste responsive sans scroll horizontal
- verifier qu'un run peut au minimum etre cree, suivi et envoye en review
- verifier que le diff ne modifie pas involontairement le deploiement web

## Publication
- Travailler sur une branche `codex/...`.
- Fusionner vers `main` pour publier le web via GitHub Actions.
- Si le backend ou le worker changent, documenter clairement les variables d'environnement et les pre-requis de deploiement separes.
