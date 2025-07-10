# 📊 Installation - SupervIA Metrics Service

Ce guide vous explique comment installer et configurer le service de métriques SupervIA qui utilise l'infrastructure centralisée (Redis, Prometheus, Grafana).

## 🚀 Vue d'ensemble

Le service de métriques SupervIA fait partie d'un écosystème de microservices et utilise une infrastructure centralisée partagée :

- **Infrastructure** : `/infra/` (Redis, Prometheus, Grafana, PostgreSQL)
- **Service Métriques** : `/metrics-service-Tadayoshi123/`
- **Autres Services** : `/auth-service/`, `/ai-service/`, etc.

## 📋 Prérequis

- **Node.js** 20+
- **Docker** & **Docker Compose**
- **Git**

## 🏗️ Installation Étape par Étape

### 1. Démarrer l'Infrastructure SupervIA

**IMPORTANT** : L'infrastructure doit être démarrée en premier !

```bash
# Aller dans le dossier infrastructure
cd ../infra

# Créer le fichier d'environnement
cp .env.example .env

# Démarrer l'infrastructure complète
docker-compose up -d

# Vérifier que tous les services sont en ligne
docker-compose ps
```

Vérification des services :
- **Redis** : `curl http://localhost:6379` (via telnet ou redis-cli)
- **Prometheus** : http://localhost:9090
- **Grafana** : http://localhost:3000 (admin/admin)
- **PostgreSQL** : localhost:5432

### 2. Configurer le Service Métriques

```bash
# Aller dans le dossier du service
cd ../metrics-service-Tadayoshi123

# Installer les dépendances
npm install

# Copier la configuration d'exemple
cp .env.example .env

# Générer un JWT secret
npm run generate-jwt
```

### 3. Configuration des Variables d'Environnement

Éditez le fichier `.env` :

```bash
# Configuration de base
NODE_ENV=development
PORT=3003
LOG_LEVEL=info

# Infrastructure partagée SupervIA
REDIS_URL=redis://localhost:6379/2
PROMETHEUS_URL=http://localhost:9090

# Services à monitorer
AUTH_SERVICE_URL=http://localhost:3001
DB_SERVICE_URL=http://localhost:3002
AI_SERVICE_URL=http://localhost:3004
NOTIFIER_SERVICE_URL=http://localhost:3005
PAYMENT_SERVICE_URL=http://localhost:3006

# Configuration des alertes
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_RESPONSE_TIME=2000
```

### 4. Démarrer le Service

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

Le service sera disponible sur http://localhost:3003

## 🐳 Déploiement Docker

### Option 1 : Service uniquement

```bash
# Construire et démarrer le service
docker-compose up -d

# Le service utilisera l'infrastructure externe
```

### Option 2 : Déploiement complet

```bash
# Démarrer l'infrastructure complète
cd ../infra
docker-compose up -d

# Démarrer le service métriques
cd ../metrics-service-Tadayoshi123
docker-compose up -d
```

## 📊 Vérification de l'Installation

### 1. Vérification des Services

Une fois le service démarré, vous pouvez vérifier son état avec les commandes suivantes :

```bash
# Vérifier la santé détaillée du service
curl http://localhost:3003/health

# Vérifier l'endpoint des métriques pour Prometheus
curl http://localhost:3003/metrics

# Vérifier l'API des métriques en temps réel
curl http://localhost:3003/api/v1/metrics
```

Vous pouvez aussi consulter la documentation interactive de l'API sur [http://localhost:3003/api-docs](http://localhost:3003/api-docs).

### 2. Vérification de l'Infrastructure

| Service      | URL                   | Identifiants | Status                    |
| ------------ | --------------------- | ------------ | ------------------------- |
| **Grafana**  | http://localhost:3030 | admin/admin  | ✅ Dashboards disponibles |
| **Prometheus**| http://localhost:9090 | -            | ✅ Targets configurés     |
| **Redis**    | localhost:6379        | -            | ✅ Multi-DB actif         |

### 3. Dashboards Grafana

Les dashboards sont automatiquement provisionnés :

1. Allez sur http://localhost:3030
2. Connectez-vous avec `admin/admin`
3. Naviguez vers **Dashboards** > **Browse**
4. Vous devriez voir :
   - **SupervIA Overview** : Vue d'ensemble de tous les services
   - **Auth Service** : Métriques détaillées du service d'authentification

## 🔧 Configuration Avancée

### Personnalisation des Seuils d'Alertes

```bash
# Dans .env
ALERT_THRESHOLD_CPU=75           # Seuil CPU (%)
ALERT_THRESHOLD_MEMORY=80        # Seuil mémoire (%)
ALERT_THRESHOLD_RESPONSE_TIME=1500  # Temps de réponse (ms)

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Configuration Multi-Environnement

```bash
# Développement
cp .env.development .env

# Production
cp .env.example .env
# Puis modifiez avec vos valeurs de production
```

## 🔥 Dépannage

### Problème : Service ne démarre pas

```bash
# Vérifier l'infrastructure
cd ../infra
docker-compose ps

# Redémarrer l'infrastructure si nécessaire
docker-compose down && docker-compose up -d
```

### Problème : Connexion Redis échoue

```bash
# Vérifier que Redis utilise la bonne DB
redis-cli -p 6379 -n 2 ping

# Vérifier les logs Redis
docker logs supervia-redis
```

### Problème : Dashboards Grafana manquants

```bash
# Vérifier le provisioning
docker exec supervia-grafana ls -la /var/lib/grafana/dashboards/

# Redémarrer Grafana
docker restart supervia-grafana
```

### Problème : Prometheus ne collecte pas

1. Vérifiez http://localhost:9090/targets
2. Assurez-vous que les services exposent `/metrics`
3. Vérifiez la configuration dans `/infra/prometheus/prometheus.yml`

## 📚 Ressources

- **Documentation API Interactive** : [http://localhost:3003/api-docs](http://localhost:3003/api-docs)
- **Métriques (Format Prometheus)** : [http://localhost:3003/metrics](http://localhost:3003/metrics)
- **Dashboards Grafana** : [http://localhost:3030](http://localhost:3030)
- **Documentation de l'Infrastructure** : `../infra/README.md`

## 🚀 Étapes Suivantes

1. **Configurer les alertes** : Ajoutez vos webhooks Slack/Discord
2. **Personnaliser les dashboards** : Modifiez les dashboards Grafana selon vos besoins
3. **Déployer d'autres services** : Démarrez les autres services SupervIA pour voir les métriques complètes
4. **Monitoring production** : Configurez les alertes pour votre environnement de production

---

🎉 **Installation terminée !** Le service de métriques SupervIA est maintenant opérationnel avec l'infrastructure centralisée. 