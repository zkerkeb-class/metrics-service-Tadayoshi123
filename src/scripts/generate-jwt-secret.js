#!/usr/bin/env node

/**
 * Script pour générer un secret JWT sécurisé
 * 
 * Usage: node generate-jwt-secret.js
 */

const crypto = require('crypto');

// Générer un secret JWT aléatoire de 64 caractères
const generateJwtSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Générer et afficher le secret
const secret = generateJwtSecret();
console.log('\n=== Secret JWT généré ===');
console.log(secret);
console.log('\nAjoutez ce secret à votre fichier .env :');
console.log(`JWT_SECRET=${secret}\n`); 