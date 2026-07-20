# Rapports — Plateforme SaaS de rapports d'activité (Nextiaa)

Plateforme **multi-entreprises (multi-tenant)** permettant aux entreprises de
digitaliser les rapports d'activité de leurs employés, avec analyse de
performance par IA (Gemini) et vente par **licence d'activation annuelle**.

## Stack technique

| Besoin | Technologie |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Base de données + Auth | Supabase (Postgres + Auth + Row Level Security) |
| Hébergement | Vercel |
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
- [ ] Module 1 — Espace Super Admin & générateur de licence
- [ ] Module 2 — Onboarding & paramétrage entreprise (form builder, templates)
- [ ] Module 3 — Gestion des employés
- [ ] Module 4 — Saisie des rapports
- [ ] Module 5 — Analyse IA (Gemini) & notation
- [ ] Module 6 — Tableau de bord manager
- [ ] Module 7 — Export PDF
- [ ] Module 8 — Export CSV
- [ ] Module 9 — Sécurité & permissions (transversal)
- [ ] Module 10 — Notifications & rapports par email (Resend)

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
- `0002_module0_rls.sql` — politiques Row Level Security.

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

## Sécurité

- La **clé `service_role`** (`SUPABASE_SERVICE_ROLE_KEY`) contourne la RLS.
  Elle n'est utilisée **que côté serveur** pour des opérations privilégiées
  contrôlées (génération de licence, activation, création de comptes employés).
  Elle ne doit **jamais** être exposée au client.
- Un garde-fou SQL empêche tout utilisateur non-super-admin de modifier son
  propre rôle système ou son entreprise (anti-élévation de privilèges).
