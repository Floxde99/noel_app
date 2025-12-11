# Guide de Déploiement - Site d'Organisation de Noël 🎄

Ce guide explique comment déployer l'application sur un VPS avec Docker, Caddy comme reverse proxy, et SSL automatique.

## Prérequis

- Un VPS avec Ubuntu 22.04+ (minimum 1 Go RAM, 20 Go SSD)
- Un nom de domaine pointant vers l'IP du VPS
- Accès SSH au serveur

## 1. Préparation du serveur

### Connexion SSH

```bash
ssh root@votre-ip
```

### Mise à jour système

```bash
apt update && apt upgrade -y
```

### Installation de Docker

```bash
# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installation de Docker Compose
apt install docker-compose-plugin -y

# Vérification
docker --version
docker compose version
```

### Création d'un utilisateur non-root (recommandé)

```bash
adduser deploy
usermod -aG docker deploy
su - deploy
```

## 2. Déploiement de l'application

### Cloner le projet

```bash
cd ~
git clone <votre-repo> noel
cd noel
```

### Configuration de l'environnement

```bash
cp .env.example .env
nano .env
```

Modifiez les valeurs de production :

```env
# Base de données (garde les valeurs Docker)
DATABASE_URL="mysql://noel:MOT_DE_PASSE_FORT@db:3306/noel_db"

# IMPORTANT: Générez des secrets uniques et longs!
JWT_SECRET="$(openssl rand -hex 64)"
REFRESH_SECRET="$(openssl rand -hex 64)"

# Votre domaine
NEXT_PUBLIC_APP_URL="https://noel.votre-domaine.com"

# Production
NODE_ENV="production"
```

Pour générer des secrets sécurisés :

```bash
openssl rand -hex 64
```

### Modifier docker-compose.yml pour la production

Mettez à jour le mot de passe MariaDB / MySQL :

```yaml
services:
  db:
    environment:
      MYSQL_ROOT_PASSWORD: MOT_DE_PASSE_FORT  # Même que dans DATABASE_URL
      MYSQL_DATABASE: noel_db
      MYSQL_USER: noel
      MYSQL_PASSWORD: MOT_DE_PASSE_FORT
```

### Build et démarrage

```bash
docker compose up -d --build
```

### Vérification

```bash
# Voir les conteneurs
docker compose ps

# Voir les logs
docker compose logs -f app

# L'application tourne sur le port 3000
curl http://localhost:3000
```

## 3. Configuration de Caddy (Reverse Proxy + SSL)

Caddy est un serveur web moderne qui gère automatiquement les certificats SSL.

### Installation de Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy -y
```

### Configuration Caddyfile

```bash
nano /etc/caddy/Caddyfile
```

Ajoutez la configuration :

```caddyfile
noel.votre-domaine.com {
    # Proxy vers l'application Next.js
    reverse_proxy localhost:3000

    # WebSocket support
    reverse_proxy /api/socketio localhost:3000 {
        header_up Upgrade {>Upgrade}
        header_up Connection {>Connection}
    }

    # Compression
    encode gzip

    # Headers de sécurité
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }

    # Logs
    log {
        output file /var/log/caddy/noel.log
    }
}
```

### Démarrer Caddy

```bash
systemctl enable caddy
systemctl restart caddy
```

### Vérification SSL

```bash
# Vérifier que Caddy tourne
systemctl status caddy

# Tester l'accès HTTPS
curl -I https://noel.votre-domaine.com
```

## 4. Firewall

```bash
# Installer UFW
apt install ufw -y

# Configuration
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https

# Activer
ufw enable
```

## 5. Maintenance

### Mise à jour de l'application

```bash
cd ~/noel
git pull
docker compose down
docker compose up -d --build
```

### Sauvegarde de la base de données

```bash
# Créer une sauvegarde
docker compose exec db sh -c 'exec mysqldump -u"${MYSQL_USER:-root}" -p"${MYSQL_ROOT_PASSWORD:-noel_password}" ${MYSQL_DATABASE:-noel_db}' > backup_$(date +%Y%m%d).sql

# Restaurer une sauvegarde
cat backup_20241201.sql | docker compose exec -T db sh -c 'exec mysql -u"${MYSQL_USER:-root}" -p"${MYSQL_ROOT_PASSWORD:-noel_password}" ${MYSQL_DATABASE:-noel_db}'
```

### Script de sauvegarde automatique

Créez `/home/deploy/backup.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cd /home/deploy/noel
docker compose exec -T db sh -c 'exec mysqldump -u"${MYSQL_USER:-root}" -p"${MYSQL_ROOT_PASSWORD:-noel_password}" ${MYSQL_DATABASE:-noel_db}' | gzip > $BACKUP_DIR/noel_$DATE.sql.gz
# Garder seulement les 7 derniers jours
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

Ajoutez au cron :

```bash
chmod +x /home/deploy/backup.sh
crontab -e
# Ajouter: 0 2 * * * /home/deploy/backup.sh
```

### Voir les logs

```bash
# Logs de l'application
docker compose logs -f app

# Logs de MariaDB
docker compose logs -f db

# Logs de Caddy
tail -f /var/log/caddy/noel.log
```

### Redémarrage

```bash
# Redémarrer l'application
docker compose restart app

# Redémarrer tout
docker compose restart
```

## 6. Monitoring (optionnel)

### Avec Docker stats

```bash
docker stats
```

### Avec Uptime Kuma (auto-hébergé)

```bash
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
```

Accédez à http://votre-ip:3001 pour configurer le monitoring.

## 7. Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
docker compose logs app

# Vérifier la connexion à la BDD
docker compose exec app npx prisma migrate status
```

### Erreur de connexion à MariaDB

```bash
# Vérifier que MariaDB est démarré
docker compose ps db

# Tester la connexion
docker compose exec db sh -c 'exec mysql -u"${MYSQL_USER:-root}" -p"${MYSQL_ROOT_PASSWORD:-noel_password}" -e "SELECT 1" ${MYSQL_DATABASE:-noel_db}'
```

### SSL ne fonctionne pas

```bash
# Vérifier les logs Caddy
journalctl -u caddy --since "10 minutes ago"

# Vérifier que le domaine pointe vers le serveur
nslookup noel.votre-domaine.com
```

### Mémoire insuffisante

```bash
# Vérifier l'utilisation mémoire
free -h

# Ajouter du swap si nécessaire
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Architecture finale

```
Internet
    │
    ▼
┌─────────┐
│  Caddy  │ (Port 443, SSL automatique)
└────┬────┘
     │
     ▼
┌─────────┐     ┌────────────┐
│ Next.js │────▶│ MariaDB/MySQL │
│  :3000  │     │   :5432    │
└─────────┘     └────────────┘
     │
     ▼
  Socket.io
  (WebSocket)
```

## Checklist de déploiement

- [ ] VPS provisionné avec Ubuntu 22.04+
- [ ] Docker et Docker Compose installés
- [ ] Domaine configuré (DNS A record)
- [ ] Variables d'environnement configurées (.env)
- [ ] Secrets générés (JWT_SECRET, REFRESH_SECRET)
- [ ] Application démarrée avec Docker Compose
- [ ] Migrations Prisma appliquées
- [ ] Caddy configuré avec le bon domaine
- [ ] SSL fonctionnel (https://)
- [ ] Firewall activé (UFW)
- [ ] Sauvegardes automatiques configurées
- [ ] Monitoring mis en place

---

🎄 Votre site de Noël est maintenant en production ! 🎅
