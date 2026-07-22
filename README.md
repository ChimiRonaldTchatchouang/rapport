# Rapports — Plateforme SaaS de rapports d'activité (Nextiaa)

Plateforme **multi-entreprises (multi-tenant)** permettant aux entreprises de
digitaliser les rapports d'activité de leurs employés, avec analyse de
performance par IA (Gemini) et vente par **licence d'activation annuelle**.

## Stack technique

| Besoin | Technologie |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Base de données + Auth | Supabase (Postgres + Auth + Row Level Security) |
| Hébergement | Render (Web Service Node) |
| Analyse IA | API Google Gemini *(Module 5)* |
| Emails | Resend *(Module 10)* |
| Styles | Tailwind CSS v4 |

## Architecture multi-tenant

Stratégie **« base partagée + `entreprise_id` + Row Level Security »**.
Chaque table métier porte une colonne `entreprise_id`. L'isolation entre
entreprises clientes est garantie **au niveau du moteur Postgres** par des
politiques RLS — pas seulement par le code applicatif. Aucune requête ne peut
traverser les tenants, même en cas de bug côté application.

### Rôles système

- **super_admin** (équipe Nextiaa) : gère les licences et les entreprises.
  N'appartient à aucune entreprise et **ne voit pas** le contenu des rapports.
- **manager** : administre **son** entreprise (employés, rôles, rapports, stats).
- **employe** : accède uniquement à **ses** propres rapports et notes.

## Feuille de route (modules)

- [x] **Module 0** — Fondations & architecture multi-tenant (schéma, RLS, auth, permissions)
- [x] **Module 1** — Espace Super Admin & générateur de licence
- [x] **Module 2** — Onboarding & paramétrage entreprise (form builder, templates)
- [x] **Module 3** — Gestion des employés
- [x] **Module 4** — Saisie des rapports (formulaire dynamique, anti copier-coller)
- [x] **Module 5** — Analyse IA (Gemini) & notation (agrégée hebdo/mensuel)
- [x] **Module 6** — Tableau de bord manager (courbes, classement, alertes, filtres)
- [x] **Module 7** — Export PDF dynamique (logo + branding, version enrichie manager)
- [x] **Module 8** — Export CSV (un fichier par template)
- [x] **Module 9** — Sécurité & permissions (RLS transversale)
- [x] **Module 10** — Notifications & rapports par email (Resend + webhook entrant)

### Décisions produit par défaut (ajustables)

- **Clé de licence** : opaque, `NEXTIAA-XXXX-XXXX-XXXX`.
- **Génération** : le Super Admin renseigne l'entreprise cible ; l'entreprise
  réelle + le 1er manager sont créés à l'**activation** (validité 1 an).
- **Confidentialité** : le Super Admin ne voit ni les rapports ni les notes.
- **Valeurs de rapport** : stockées en JSONB (snapshot label+type+valeur).
- **CSV** : un fichier par template (colonnes propres).
- **Analyse IA** : agrégée (hebdo/mensuel), déclenchable manuellement par le
  manager ou automatiquement via CRON.
- **Email entrant** : format semi-structuré `Label : valeur` mappé sur les
  champs du template, avec repli « Note libre » pour le texte non reconnu.

## Structure

```
src/
  app/
    (app)/              Espace authentifié (layout avec sidebar par rôle)
      dashboard/        Tableau de bord adaptatif (super admin / manager / employé)
      admin/            Super Admin : licences, entreprises
      equipe, roles, templates, rapports, performances, exports, parametres  (manager)
      nouveau-rapport, mes-rapports, mes-performances                        (employé)
    activation/         Activation de licence + création du compte entreprise
    impression/rapport/[id]/   Export PDF (HTML imprimable)
    api/
      exports/csv/      Export CSV
      email/inbound/    Webhook rapports par email (Module 10.2)
      cron/analyses/    Analyse IA planifiée (Module 5)
  components/           Design system (cards, charts SVG, sidebar, icônes…)
  lib/
    supabase/           Clients (browser / server / admin)
    auth/               Permissions & helpers de rôle
    ia/                 Intégration Gemini + orchestration
    email/              Resend + parsing entrant
    rapports/           Similarité + formatage PDF/email
    exports/            CSV
    data/               Périodes / agrégation
```

## Emails (Module 10)

- **Sortant** (10.1) : à chaque soumission, le manager reçoit un email Resend
  (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Best-effort : n'échoue pas la
  soumission si l'email n'est pas configuré.
- **Entrant** (10.2) : configurer le routage d'un domaine dédié (Resend Inbound
  ou équivalent) vers `POST /api/email/inbound?token=<RESEND_WEBHOOK_SECRET>`.
  Format attendu : une ligne `Label du champ : valeur` par champ du template.

## Analyse IA planifiée (CRON)

`vercel.json` déclenche `/api/cron/analyses` chaque lundi (semaine écoulée) et
le 1er du mois (mois écoulé). Nécessite `CRON_SECRET` et `GEMINI_API_KEY`.

## Démarrage local

### 1. Variables d'environnement

```bash
cp .env.example .env.local
```

Renseignez les valeurs Supabase (URL, clé anon, clé service_role). Voir
`.env.example` pour la liste complète. **Ne committez jamais `.env.local`.**

### 2. Base de données

Appliquez les migrations SQL du dossier `supabase/migrations/` dans l'ordre,
via l'éditeur SQL du tableau de bord Supabase ou la CLI Supabase :

```bash
# Avec la CLI Supabase (optionnel)
supabase db push
```

Les migrations :

- `0001_module0_schema.sql` — tables (`entreprises`, `roles_metier`,
  `utilisateurs`, `licences`) + fonctions utilitaires de sécurité.
- `0002_module0_rls.sql` — politiques Row Level Security (Module 0).
- `0003_modules_1_to_5_schema.sql` — templates, champs, associations rôle↔template,
  rapports (JSONB), notes de performance.
- `0004_modules_1_to_5_rls.sql` — RLS des rapports/notes (super admin sans accès
  au contenu) et de la configuration (manager).
- `0005_analyse_par_rapport.sql` — analyse IA par rapport (note/avis/observations).
- `0006_objectifs.sql` — objectifs hebdomadaires du manager + RLS.

Appliquez les 6 fichiers dans l'ordre — ou collez le fichier tout-en-un
`supabase/setup.sql` (concaténation des 6, à exécuter une fois sur une base neuve).

### 3. Créer le premier Super Admin (bootstrap)

Il n'existe pas encore d'interface d'inscription Super Admin (Module 1). Pour
amorcer la plateforme :

1. Dans **Supabase > Authentication > Users**, créez un utilisateur
   (email + mot de passe).
2. Copiez son `id` (UUID), puis dans **SQL Editor** :

```sql
insert into public.utilisateurs (id, entreprise_id, role_systeme, nom, email)
values ('<UUID_AUTH_USER>', null, 'super_admin', 'Nom Prénom', 'admin@nextiaa.com');
```

### 4. Lancer l'application

```bash
npm install
npm run dev
```

L'app tourne sur http://localhost:3000.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run typecheck` | Vérification TypeScript |

## Déploiement sur Render

Le dépôt contient un Blueprint `render.yaml` (Web Service Node, région Frankfurt).

1. **Render → New → Blueprint**, sélectionnez ce dépôt. Render lit `render.yaml`.
   - Build : `npm ci && npm run build` · Start : `npm run start`
   - Node 22 (via `NODE_VERSION` et `.node-version`). Le port est fourni par
     Render (`$PORT`) et pris en charge automatiquement par `next start`.
2. **Variables d'environnement** (onglet Environment du service). ⚠️ Les
   `NEXT_PUBLIC_*` sont inlinées au **build** : définissez-les AVANT le premier
   déploiement, sinon relancez un déploiement après les avoir ajoutées.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (clé `sb_secret_…`)
   - `GEMINI_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_APP_URL` = l'URL publique Render (ex. `https://rapport.onrender.com`)
3. Appliquez les migrations Supabase (voir plus haut) et créez le Super Admin.

> Le plan **free** de Render met le service en veille après inactivité
> (premier accès plus lent). `vercel.json` n'est utilisé que si vous déployez
> sur Vercel — Render l'ignore.

### CRON de l'analyse IA sur Render

`/api/cron/analyses` attend `Authorization: Bearer $CRON_SECRET` (ou `?token=`).
Deux options :

- **Render Cron Job** (plan payant) : créez un Cron Job qui exécute
  `curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$NEXT_PUBLIC_APP_URL/api/cron/analyses?type=hebdomadaire"`
  (planning `0 6 * * 1`), et un second `type=mensuel` (`0 6 1 * *`).
- **Cron externe gratuit** (ex. cron-job.org) : appelez la même URL avec le
  header d'autorisation, aux mêmes fréquences.

## Sécurité

- La **clé `service_role`** (`SUPABASE_SERVICE_ROLE_KEY`) contourne la RLS.
  Elle n'est utilisée **que côté serveur** pour des opérations privilégiées
  contrôlées (génération de licence, activation, création de comptes employés).
  Elle ne doit **jamais** être exposée au client.
- Un garde-fou SQL empêche tout utilisateur non-super-admin de modifier son
  propre rôle système ou son entreprise (anti-élévation de privilèges).
