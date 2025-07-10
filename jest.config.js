// jest.config.js
module.exports = {
  // L'environnement de test que Jest utilisera
  testEnvironment: 'node',

  // Un glob pour indiquer à Jest où se trouvent les fichiers de test
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],

  // Arrêter l'exécution des tests après le premier échec
  bail: 1,

  // Afficher un rapport de couverture de code après les tests
  collectCoverage: true,

  // Le répertoire où Jest doit stocker les rapports de couverture
  coverageDirectory: 'coverage',

  // Ignorer certains chemins pour la couverture de code
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/src/config/',
    '/src/scripts/',
    '/src/server.js', // Le point d'entrée principal
  ],

  // Réinitialiser les mocks avant chaque test
  resetMocks: true,

  // Restaurer l'état des mocks avant chaque test
  restoreMocks: true,

  // Temps maximum pour l'exécution d'un test (en ms)
  testTimeout: 30000,

  // Afficher les détails de chaque test pendant l'exécution
  verbose: true,
}; 