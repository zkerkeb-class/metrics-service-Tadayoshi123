# Dockerfile pour le service de métriques SupervIA
# Multi-stage Dockerfile optimisé pour la production

# ===================================
# 🏗️ STAGE 1: BUILDER
# Installe toutes les dépendances nécessaires.
# ===================================
FROM node:20-alpine AS builder

WORKDIR /app

# Installer les outils de compilation (temporairement)
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++

# Copier les fichiers de dépendances et installer
COPY package*.json ./
RUN npm install

# Nettoyer les outils de compilation
RUN apk del .build-deps

# ===================================
# 🚀 STAGE 2: PRODUCTION
# Construit l'image finale, légère et sécurisée.
# ===================================
FROM node:20-alpine

ENV NODE_ENV=production

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodeuser

WORKDIR /app

# Copier les dépendances de l'étape 'builder'
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --chown=nodeuser:nodejs package.json ./

# Supprimer les dépendances de développement
RUN npm prune --production

# Copier le code source de l'application
COPY --chown=nodeuser:nodejs src ./src
COPY --chown=nodeuser:nodejs volumes ./volumes

# Exposition du port
EXPOSE 3003

# Vérification de la santé du conteneur
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3003/health || exit 1

# Passage à l'utilisateur non-root
USER nodeuser

# Commande de démarrage
CMD ["node", "src/server.js"] 