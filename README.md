# SAV Chien Heureux — Backend

Backend Node.js + Express pour l'interface SAV de Chien Heureux.

## Stack
- Node.js + Express
- SQLite (better-sqlite3)
- IMAP/SMTP OVH pour les mails
- API Shopify Admin

## Installation sur le VPS

### 1. Connexion SSH
```bash
ssh root@TON_IP_VPS
```

### 2. Installer Node.js + outils
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs git
npm install -g pm2
```

### 3. Cloner le repo
```bash
cd /root
git clone https://github.com/TON_USERNAME/sav-chien-heureux.git
cd sav-chien-heureux/backend
```

### 4. Configurer le .env
```bash
cp .env.example .env
nano .env
```
Remplis toutes les valeurs (Shopify token, mot de passe mail OVH, etc.)

### 5. Installer les dépendances et lancer
```bash
npm install
pm2 start index.js --name sav-backend
pm2 save
pm2 startup
```

### 6. Vérifier que ça tourne
```bash
pm2 status
curl http://localhost:3001/api/ping
```

## Routes API

### Shopify
- `GET /api/shopify/orders` — liste des commandes
- `GET /api/shopify/orders/:id` — détail commande
- `GET /api/shopify/customers/search?email=xxx` — recherche client
- `GET /api/shopify/customers/:id/orders` — commandes d'un client
- `GET /api/shopify/alerts` — commandes en retard

### Mail
- `GET /api/mail/inbox` — boîte de réception
- `POST /api/mail/send` — envoyer un email

### Tickets
- `GET /api/tickets` — liste tickets
- `GET /api/tickets/:id` — détail ticket + messages
- `POST /api/tickets` — créer ticket
- `PATCH /api/tickets/:id` — mettre à jour ticket
- `POST /api/tickets/:id/messages` — ajouter message
- `DELETE /api/tickets/:id` — supprimer ticket

## GitHub Actions (déploiement auto)

Dans ton repo GitHub → Settings → Secrets → Actions, ajoute :
- `VPS_IP` → l'adresse IP de ton VPS
- `VPS_PASSWORD` → le mot de passe root du VPS

À chaque push sur `main`, le backend se redéploie automatiquement.
