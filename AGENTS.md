# AGENTS.md

## Objectif produit
- ViraxStudio est une application web React/Vite qui aide a automatiser un pipeline YouTube: configuration de chaine, generation de script, creation de voix off, puis publication.
- Le produit actuel est 100% front-end. Les cles API et tokens sont stockes dans `localStorage` sous la cle unique `virax_config`.
- Toute nouvelle fonctionnalite doit rester compatible avec le deploiement statique Vite et avec le workflow GitHub Actions qui publie le dossier `dist/` sur o2switch lors d'un push sur `main`.

## Stack et architecture
- React 18 + Vite 5
- React Router v6
- Styles majoritairement inline, avec base globale dans `src/index.css`
- Pages principales:
  - `src/pages/Dashboard.jsx`
  - `src/pages/ChannelSetup.jsx`
  - `src/pages/ScriptGen.jsx`
  - `src/pages/VideoBuilder.jsx`
  - `src/pages/Publisher.jsx`
  - `src/pages/Settings.jsx`
- Shell global:
  - `src/App.jsx` gere le state `config` et le persiste dans `localStorage`
  - `src/components/Layout.jsx` gere la navigation et le cadre responsive global

## Invariants a preserver
- Ne pas changer la cle `localStorage` `virax_config` sans migration explicite.
- Ne pas casser les routes existantes:
  - `/`
  - `/channel`
  - `/script`
  - `/video`
  - `/publish`
  - `/settings`
- Ne pas introduire de dependance serveur obligatoire: l'application doit continuer a fonctionner comme site statique Vite.
- Garder le workflow `.github/workflows/deploy.yml` compatible avec un `npm ci` puis `npm run build`.
- Preserver le look actuel: theme sombre, accents rouge/orange, cartes contrastees, navigation laterale desktop.

## Regles de modification
- Preferer des changements simples et lisibles plutot qu'une abstraction prematuree.
- Si une nouvelle UI est ajoutee, reutiliser les classes globales responsives existantes avant d'introduire un nouveau systeme.
- Les composants doivent rester robustes sur mobile, tablette et desktop. Eviter:
  - les largeurs fixes
  - les grilles `1fr 1fr` sans fallback mobile
  - les `display:flex` sans `flex-wrap` quand le contenu peut s'allonger
- Si une nouvelle cle ou preference est stockee, l'ajouter dans l'objet `config` sans supprimer les cles deja utilisees.
- Pour les liens internes, preferer `Link`/`NavLink` de `react-router-dom`.
- Pour les liens externes, conserver `target="_blank"` avec `rel="noopener noreferrer"`.

## Zones sensibles
- `ChannelSetup.jsx`: gere OAuth Google via hash URL et stocke le token dans `virax_config`.
- `ScriptGen.jsx` et `Publisher.jsx`: consomment l'API Anthropic directement depuis le navigateur.
- `VideoBuilder.jsx`: consomme ElevenLabs directement depuis le navigateur.
- `Publisher.jsx`: envoie les fichiers a l'API YouTube avec upload resumable.
- Toute modification sur ces pages doit conserver les flux existants ou expliciter une migration.

## Workflow recommande pour ajouter une fonctionnalite
1. Lire `src/App.jsx`, `src/components/Layout.jsx` et la page cible pour comprendre l'etat stocke et le parcours utilisateur.
2. Verifier si le changement doit affecter le responsive global ou seulement une page.
3. Reutiliser les classes de `src/index.css` pour les conteneurs, grilles, boutons et banners.
4. Garder la logique metier separee des ajustements visuels.
5. Tester au minimum:
   - `npm run build`
   - navigation entre pages
   - absence de scroll horizontal
   - rendu mobile autour de 320-375 px

## Checklist avant push
- `npm ci`
- `npm run build`
- verifier que les nouvelles cartes, formulaires et CTA se replient correctement en mobile
- verifier qu'aucun lien interne ne provoque de comportement inattendu
- verifier que les secrets ne sont jamais commit
- verifier que le diff ne modifie pas involontairement le workflow de deploiement

## Git et publication
- Travailler sur une branche `codex/...` puis fusionner dans `main` pour publier.
- Un push sur `main` declenche automatiquement le workflow de deploiement GitHub Actions.
- Si le changement touche le responsive, decrire dans le compte-rendu les breakpoints verifies et les zones sensibles restantes.
