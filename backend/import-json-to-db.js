import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { animalTranslations, categoryTranslations } from './animal-translations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path - use template.sqlite3
const dbPath = path.join(__dirname, 'databases', 'template.sqlite3');
const db = new Database(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// Translation helper - creates JSON structure for multilingual fields
function createMultilingualJson(enText, field) {
  // Add your Swedish and Norwegian translations here
  const translations = {
    name: {
      // Frame specifications
      'Large Portrait': { sv: 'Stort porträtt', no: 'Stort portrett' },
      'Medium Portrait': { sv: 'Mellanstort porträtt', no: 'Middels portrett' },
      'Small Portrait': { sv: 'Litet porträtt', no: 'Lite portrett' },
      'Square': { sv: 'Fyrkant', no: 'Kvadrat' },
      'Small Landscape': { sv: 'Litet landskap', no: 'Lite landskap' },
      
      // Frame materials
      'Black Wood': { sv: 'Svart trä', no: 'Svart tre' },
      'Natural Wood': { sv: 'Naturligt trä', no: 'Naturlig tre' },
      'White Wood': { sv: 'Vitt trä', no: 'Hvitt tre' },
      'Silver Metal': { sv: 'Silvermetall', no: 'Sølvmetall' },
      'Gold Metal': { sv: 'Guldmetall', no: 'Gullmetall' },
      
      // Animals are imported from animal-translations.js
      ...animalTranslations
    },
    description: {
      // Frame specifications
      'Large portrait frame, perfect for striking animal portraits': {
        sv: 'Stor porträttram, perfekt för slående djurporträtt',
        no: 'Stor portrettramme, perfekt for slående dyreportretter'
      },
      'Medium portrait frame for standard animal photos': {
        sv: 'Mellanstort porträttram för vanliga djurfoton',
        no: 'Middels portrettramme for standard dyrebilder'
      },
      'Compact portrait frame ideal for detailed animal shots': {
        sv: 'Kompakt porträttram idealisk för detaljerade djurbilder',
        no: 'Kompakt portrettramme ideell for detaljerte dyrebilder'
      },
      'Perfect square frame for artistic animal compositions': {
        sv: 'Perfekt fyrkantig ram för konstnärliga djurkompositioner',
        no: 'Perfekt kvadratisk ramme for kunstneriske dyrekomposisjoner'
      },
      'Small landscape frame for wide animal scenes': {
        sv: 'Liten landskapsram för breda djurscener',
        no: 'Liten landskapsramme for brede dyrescener'
      }
    },
    category: {
      // Categories are imported from animal-translations.js
      ...categoryTranslations
    },
    style: {
      'Modern': { sv: 'Modern', no: 'Moderne' },
      'Rustic': { sv: 'Rustik', no: 'Rustikk' },
      'Traditional': { sv: 'Traditionell', no: 'Tradisjonell' },
      'Contemporary': { sv: 'Samtida', no: 'Samtids' },
      'Premium': { sv: 'Premium', no: 'Premium' }
    },
    material: {
      'Wood': { sv: 'Trä', no: 'Tre' },
      'Metal': { sv: 'Metall', no: 'Metall' }
    },
    color: {
      'Black': { sv: 'Svart', no: 'Svart' },
      'Natural': { sv: 'Natur', no: 'Naturlig' },
      'White': { sv: 'Vit', no: 'Hvit' },
      'Silver': { sv: 'Silver', no: 'Sølv' },
      'Gold': { sv: 'Guld', no: 'Gull' }
    }
  };
  
  const fieldTranslations = translations[field] || {};
  const translation = fieldTranslations[enText] || {};
  
  return JSON.stringify({
    en: enText,
    sv: translation.sv || enText,
    no: translation.no || enText
  });
}

// Create tables
console.log('Creating tables...');

db.exec(`
  CREATE TABLE IF NOT EXISTS frameSpecifications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    frameWidthCm INTEGER NOT NULL,
    frameHeightCm INTEGER NOT NULL,
    imageAreaWidthCm INTEGER NOT NULL,
    imageAreaHeightCm INTEGER NOT NULL,
    matOpeningWidthCm INTEGER NOT NULL,
    matOpeningHeightCm INTEGER NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS frameMaterials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    material TEXT NOT NULL,
    color TEXT NOT NULL,
    style TEXT NOT NULL,
    priceMultiplier REAL NOT NULL,
    cssBackground TEXT
  );

  CREATE TABLE IF NOT EXISTS framePricing (
    frameSpecId TEXT PRIMARY KEY,
    basePrice REAL NOT NULL,
    FOREIGN KEY (frameSpecId) REFERENCES frameSpecifications(id)
  );

  CREATE TABLE IF NOT EXISTS animals (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    wikiUrl TEXT,
    imageAspectRatio REAL,
    category TEXT NOT NULL
  );
`);

// Read JSON files
const jsonDir = path.join(__dirname, '..', 'public', 'json');
const frameSpecsData = JSON.parse(fs.readFileSync(path.join(jsonDir, 'frame-specifications.json'), 'utf8'));
const frameMaterialsData = JSON.parse(fs.readFileSync(path.join(jsonDir, 'frame-materials.json'), 'utf8'));
const framePricingData = JSON.parse(fs.readFileSync(path.join(jsonDir, 'frame-pricing.json'), 'utf8'));
const animalsData = JSON.parse(fs.readFileSync(path.join(jsonDir, 'animals.json'), 'utf8'));

// Prepare statements
const insertFrameSpec = db.prepare(`
  INSERT OR REPLACE INTO frameSpecifications 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertFrameMaterial = db.prepare(`
  INSERT OR REPLACE INTO frameMaterials 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertFramePricing = db.prepare(`
  INSERT OR REPLACE INTO framePricing 
  VALUES (?, ?)
`);

const insertAnimal = db.prepare(`
  INSERT OR REPLACE INTO animals 
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Import frame specifications
console.log('Importing frame specifications...');
const insertSpecs = db.transaction((specs) => {
  for (const spec of specs) {
    insertFrameSpec.run(
      spec.id,
      createMultilingualJson(spec.name, 'name'),
      spec.slug,
      spec.frameWidthCm,
      spec.frameHeightCm,
      spec.imageAreaWidthCm,
      spec.imageAreaHeightCm,
      spec.matOpeningWidthCm,
      spec.matOpeningHeightCm,
      createMultilingualJson(spec.description, 'description')
    );
  }
});
insertSpecs(frameSpecsData.frameSpecs);

// Import frame materials
console.log('Importing frame materials...');
const insertMaterials = db.transaction((materials) => {
  for (const material of materials) {
    insertFrameMaterial.run(
      material.id,
      createMultilingualJson(material.name, 'name'),
      material.slug,
      createMultilingualJson(material.material, 'material'),
      createMultilingualJson(material.color, 'color'),
      createMultilingualJson(material.style, 'style'),
      material.priceMultiplier,
      material.cssBackground
    );
  }
});
insertMaterials(frameMaterialsData.materials);

// Import frame pricing
console.log('Importing frame pricing...');
const insertPricing = db.transaction((prices) => {
  for (const [frameSpecId, basePrice] of Object.entries(prices)) {
    insertFramePricing.run(frameSpecId, basePrice);
  }
});
insertPricing(framePricingData.basePrices);

// Import all animals
console.log('Importing animals...');
const insertAnimals = db.transaction((animals) => {
  // Import all animals
  for (const animal of animals) {
    insertAnimal.run(
      animal.id,
      createMultilingualJson(animal.name, 'name'),
      animal.slug,
      createMultilingualJson(animal.description, 'description'),
      animal.wikiUrl,
      animal.imageAspectRatio,
      createMultilingualJson(animal.category, 'category')
    );
  }
});
insertAnimals(animalsData);

// Add ACL rules for new tables
console.log('Adding ACL rules...');
const insertAcl = db.prepare(`
  INSERT OR IGNORE INTO acl (userRoles, method, restApiRoute, comment)
  VALUES (?, ?, ?, ?)
`);

const aclRules = [
  // Animals - everyone can read
  ['visitor, user, admin', 'GET', '/api/animals', 'Allow all users to see animals'],
  // Frame specifications - everyone can read
  ['visitor, user, admin', 'GET', '/api/frameSpecifications', 'Allow all users to see frame specifications'],
  // Frame materials - everyone can read
  ['visitor, user, admin', 'GET', '/api/frameMaterials', 'Allow all users to see frame materials'],
  // Frame pricing - everyone can read
  ['visitor, user, admin', 'GET', '/api/framePricing', 'Allow all users to see frame pricing'],
  // Admin write permissions
  ['admin', 'POST', '/api/animals', 'Allow admins to create animals'],
  ['admin', 'PUT', '/api/animals', 'Allow admins to update animals'],
  ['admin', 'DELETE', '/api/animals', 'Allow admins to delete animals'],
  ['admin', 'POST', '/api/frameSpecifications', 'Allow admins to create frame specifications'],
  ['admin', 'PUT', '/api/frameSpecifications', 'Allow admins to update frame specifications'],
  ['admin', 'DELETE', '/api/frameSpecifications', 'Allow admins to delete frame specifications'],
  ['admin', 'POST', '/api/frameMaterials', 'Allow admins to create frame materials'],
  ['admin', 'PUT', '/api/frameMaterials', 'Allow admins to update frame materials'],
  ['admin', 'DELETE', '/api/frameMaterials', 'Allow admins to delete frame materials'],
  ['admin', 'POST', '/api/framePricing', 'Allow admins to create frame pricing'],
  ['admin', 'PUT', '/api/framePricing', 'Allow admins to update frame pricing'],
  ['admin', 'DELETE', '/api/framePricing', 'Allow admins to delete frame pricing']
];

const insertAclRules = db.transaction((rules) => {
  for (const rule of rules) {
    insertAcl.run(...rule);
  }
});
insertAclRules(aclRules);

// Close database
db.close();

console.log('Import completed successfully!');
console.log('\nTables created:');
console.log('- frameSpecifications');
console.log('- frameMaterials');
console.log('- framePricing');
console.log('- animals');
console.log('\nACL rules added for all new tables');
console.log('\nMultilingual fields are stored as JSON with en, sv, and no translations.');