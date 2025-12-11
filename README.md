# Site d'Organisation de Noël 🎄

Application web complète pour organiser vos fêtes de Noël en famille. Gérez les contributions, créez des sondages, assignez des tâches et chattez en temps réel.

## Fonctionnalités

- 🔐 **Authentification simple** : Connexion par nom + code d'événement
- 🎉 **Multi-événements** : Gérez plusieurs fêtes (Réveillon, Déjeuner de Noël, etc.)
- 🎁 **Contributions** : Qui apporte quoi ? Suivez les apports de chacun
- 📊 **Sondages** : Votez pour les menus, activités, etc. (choix unique ou multiple)
- ✅ **Tâches** : Assignez et suivez les préparatifs
- 💬 **Chat temps réel** : Discutez avec tous les participants
- 👴 **Accessibilité** : Interface adaptée aux seniors (grands boutons, contraste élevé)
- 🛡️ **Admin** : Dashboard complet pour gérer événements, codes et utilisateurs

## Stack Technique

- **Frontend** : Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI** : Shadcn/ui (composants accessibles)
- **Backend** : API Routes Next.js
- **Base de données** : MariaDB/MySQL + Prisma ORM
- **Temps réel** : Socket.io
- **Auth** : JWT + Refresh Tokens (cookies HttpOnly)
- **Validation** : Zod
- **Déploiement** : Docker + Docker Compose

## Prérequis

- Node.js 20+
- Docker & Docker Compose
- MariaDB / MySQL (via Docker ou installé localement)

## Installation rapide

### 1. Cloner et installer

```bash
git clone <votre-repo>
cd noel
npm install
```

### 2. Configuration

Copiez le fichier d'environnement :

```bash
cp .env.example .env
```

Modifiez `.env` avec vos valeurs :

```env
DATABASE_URL="mysql://noel:noel_password@localhost:3306/noel_db"
JWT_SECRET="votre-secret-jwt-tres-long-et-securise"
REFRESH_SECRET="votre-secret-refresh-different"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Démarrer avec Docker

```bash
# Démarrer MariaDB
docker compose up -d db

# Appliquer les migrations
# Note: Si vous migrez depuis PostgreSQL, supprimez ou recréez les migrations Prisma pour MySQL avant d'exécuter la commande ci-dessous.
# Cela supprimera toutes les données locales, utilisez avec précaution en production.

npx prisma migrate dev

# Seeder la base de données
npx prisma db seed

# Démarrer l'application
npm run dev
```

### 4. Accéder à l'application

- Application : http://localhost:3000
- Prisma Studio : `npx prisma studio` (port 5555)

## Identifiants par défaut

| Nom | Code | Rôle |
|-----|------|------|
| Admin | ADMIN2024 | Administrateur |
| Marie | NOEL2024 | Utilisateur |
| Pierre | NOEL2024 | Utilisateur |
| Sophie | NOEL2024 | Utilisateur |

## Structure du projet

```
noel/
├── prisma/
│   ├── schema.prisma    # Modèles de données
│   └── seed.ts          # Données initiales
├── src/
│   ├── app/
│   │   ├── api/         # Routes API
│   │   ├── admin/       # Dashboard admin
│   │   ├── dashboard/   # Page principale
│   │   ├── events/      # Pages événements
│   │   ├── login/       # Page connexion
│   │   └── profile/     # Profil utilisateur
│   ├── components/
│   │   └── ui/          # Composants Shadcn
│   ├── lib/
│   │   ├── auth.ts      # Logique authentification
│   │   ├── prisma.ts    # Client Prisma
│   │   └── validations.ts # Schémas Zod
│   └── providers/       # Contextes React
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## API Routes

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraîchir le token
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Utilisateur actuel

### Événements
- `GET /api/events` - Liste des événements de l'utilisateur
- `GET /api/events/[id]` - Détails d'un événement

### Contributions
- `GET/POST /api/contributions` - Liste/Créer contributions
- `PATCH/DELETE /api/contributions/[id]` - Modifier/Supprimer

### Sondages
- `GET/POST /api/polls` - Liste/Créer sondages
- `POST /api/polls/[id]/vote` - Voter
- `POST /api/polls/[id]/close` - Clôturer (admin)

### Tâches
- `GET/POST /api/tasks` - Liste/Créer tâches
- `PATCH/DELETE /api/tasks/[id]` - Modifier/Supprimer

### Chat
- `GET/POST /api/chat` - Messages du chat

### Admin
- `GET/POST /api/admin/events` - Gérer événements
- `GET/POST /api/admin/codes` - Gérer codes d'accès
- `GET /api/admin/users` - Lister utilisateurs
- `PATCH/DELETE /api/admin/users/[id]` - Modifier/Supprimer utilisateurs

## Déploiement Production

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour le guide complet de déploiement sur VPS avec Docker, Caddy et SSL.

### Commandes Docker

```bash
# Build et démarrer en production
docker compose up -d --build

# Voir les logs
docker compose logs -f

# Arrêter
docker compose down

# Reset complet (attention: supprime les données!)
docker compose down -v
```

## Développement

```bash
# Mode développement avec rechargement à chaud
npm run dev

# Build production
npm run build

# Démarrer en production
npm start

# Linter
npm run lint

# Prisma Studio (interface visuelle BDD)
npx prisma studio
```

## Personnalisation

### Thème de couleurs

Modifiez `src/app/globals.css` pour changer les couleurs du thème :

```css
:root {
  --primary: 142.1 76.2% 36.3%;     /* Vert sapin */
  --destructive: 0 84.2% 60.2%;      /* Rouge Noël */
  --accent: 45 93% 47%;              /* Or/Doré */
}
```

### Accessibilité

L'application inclut :
- Tailles de police ajustables (petit/moyen/grand)
- Contraste élevé WCAG AA+
- Navigation au clavier
- Attributs ARIA

## Licence

MIT - Libre d'utilisation et modification.

---

🎅 Joyeuses fêtes ! 🎄
