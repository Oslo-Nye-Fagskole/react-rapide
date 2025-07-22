import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path - use template.sqlite3
const dbPath = path.join(__dirname, 'databases', 'template.sqlite3');
const db = new Database(dbPath);

console.log('Setting up frame cart system...');

// First, drop old products-based cart tables/views if they exist
console.log('Removing old product-based cart system...');
try {
  db.exec('DROP VIEW IF EXISTS orderRowSums');
  db.exec('DROP VIEW IF EXISTS orderTotals');
  db.exec('DROP VIEW IF EXISTS orderSummaries');
  db.exec('DROP TABLE IF EXISTS orderRowSums');
  db.exec('DROP TABLE IF EXISTS orderTotals');
  db.exec('DROP TABLE IF EXISTS orderSummaries');
} catch (e) {
  console.log('Some cleanup failed (this is expected):', e.message);
}

// Create new frame-based cart system
console.log('Creating frame cart tables...');

db.exec(`
  -- Update orderLines table to handle frame configurations
  DROP TABLE IF EXISTS orderLines;
  CREATE TABLE orderLines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL,
    animalId INTEGER NOT NULL,
    frameSpecId TEXT NOT NULL,
    frameMaterialId TEXT NOT NULL,
    withMat BOOLEAN NOT NULL DEFAULT 1,
    quantity INTEGER NOT NULL DEFAULT 1,
    unitPrice REAL NOT NULL,
    totalPrice REAL NOT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(id),
    FOREIGN KEY (animalId) REFERENCES animals(id),
    FOREIGN KEY (frameSpecId) REFERENCES frameSpecifications(id),
    FOREIGN KEY (frameMaterialId) REFERENCES frameMaterials(id)
  );

  -- Create view for enriched order rows with all details
  CREATE VIEW orderRowDetails AS
  SELECT 
    ol.id as orderLineId,
    ol.orderId,
    ol.quantity,
    ol.unitPrice,
    ol.totalPrice,
    ol.withMat,
    ol.created,
    -- Animal details
    a.id as animalId,
    JSON_EXTRACT(a.name, '$.en') as animalName_en,
    JSON_EXTRACT(a.name, '$.sv') as animalName_sv,
    JSON_EXTRACT(a.name, '$.no') as animalName_no,
    a.slug as animalSlug,
    a.imageAspectRatio,
    JSON_EXTRACT(a.category, '$.en') as category_en,
    JSON_EXTRACT(a.category, '$.sv') as category_sv,
    JSON_EXTRACT(a.category, '$.no') as category_no,
    -- Frame specification details
    fs.id as frameSpecId,
    JSON_EXTRACT(fs.name, '$.en') as frameSpecName_en,
    JSON_EXTRACT(fs.name, '$.sv') as frameSpecName_sv,
    JSON_EXTRACT(fs.name, '$.no') as frameSpecName_no,
    fs.frameWidthCm,
    fs.frameHeightCm,
    fs.imageAreaWidthCm,
    fs.imageAreaHeightCm,
    fs.matOpeningWidthCm,
    fs.matOpeningHeightCm,
    -- Frame material details
    fm.id as frameMaterialId,
    JSON_EXTRACT(fm.name, '$.en') as materialName_en,
    JSON_EXTRACT(fm.name, '$.sv') as materialName_sv,
    JSON_EXTRACT(fm.name, '$.no') as materialName_no,
    JSON_EXTRACT(fm.material, '$.en') as material_en,
    JSON_EXTRACT(fm.material, '$.sv') as material_sv,
    JSON_EXTRACT(fm.material, '$.no') as material_no,
    JSON_EXTRACT(fm.color, '$.en') as color_en,
    JSON_EXTRACT(fm.color, '$.sv') as color_sv,
    JSON_EXTRACT(fm.color, '$.no') as color_no,
    JSON_EXTRACT(fm.style, '$.en') as style_en,
    JSON_EXTRACT(fm.style, '$.sv') as style_sv,
    JSON_EXTRACT(fm.style, '$.no') as style_no,
    fm.priceMultiplier,
    fm.cssBackground,
    -- Base pricing
    fp.basePrice
  FROM orderLines ol
  JOIN animals a ON ol.animalId = a.id
  JOIN frameSpecifications fs ON ol.frameSpecId = fs.id
  JOIN frameMaterials fm ON ol.frameMaterialId = fm.id
  JOIN framePricing fp ON ol.frameSpecId = fp.frameSpecId;

  -- Create language-aware views for different languages
  CREATE VIEW orderRowDetails_en AS
  SELECT 
    orderLineId, orderId, quantity, unitPrice, totalPrice, withMat, created,
    animalId, animalName_en as animalName, animalSlug, imageAspectRatio, category_en as category,
    frameSpecId, frameSpecName_en as frameSpecName, 
    frameWidthCm, frameHeightCm, imageAreaWidthCm, imageAreaHeightCm, 
    matOpeningWidthCm, matOpeningHeightCm,
    frameMaterialId, materialName_en as materialName, 
    material_en as material, color_en as color, style_en as style,
    priceMultiplier, cssBackground, basePrice
  FROM orderRowDetails;

  CREATE VIEW orderRowDetails_sv AS
  SELECT 
    orderLineId, orderId, quantity, unitPrice, totalPrice, withMat, created,
    animalId, animalName_sv as animalName, animalSlug, imageAspectRatio, category_sv as category,
    frameSpecId, frameSpecName_sv as frameSpecName,
    frameWidthCm, frameHeightCm, imageAreaWidthCm, imageAreaHeightCm, 
    matOpeningWidthCm, matOpeningHeightCm,
    frameMaterialId, materialName_sv as materialName,
    material_sv as material, color_sv as color, style_sv as style,
    priceMultiplier, cssBackground, basePrice
  FROM orderRowDetails;

  CREATE VIEW orderRowDetails_no AS
  SELECT 
    orderLineId, orderId, quantity, unitPrice, totalPrice, withMat, created,
    animalId, animalName_no as animalName, animalSlug, imageAspectRatio, category_no as category,
    frameSpecId, frameSpecName_no as frameSpecName,
    frameWidthCm, frameHeightCm, imageAreaWidthCm, imageAreaHeightCm, 
    matOpeningWidthCm, matOpeningHeightCm,
    frameMaterialId, materialName_no as materialName,
    material_no as material, color_no as color, style_no as style,
    priceMultiplier, cssBackground, basePrice
  FROM orderRowDetails;

  -- Create order totals view
  CREATE VIEW orderTotals AS
  SELECT 
    orderId as id,
    COUNT(*) as itemCount,
    SUM(quantity) as totalQuantity,
    SUM(totalPrice) as totalAmount,
    'TOTAL' as itemType
  FROM orderLines
  GROUP BY orderId;
`);

// Update ACL rules for new cart system
console.log('Updating ACL rules...');
const updateAcl = db.prepare(`
  UPDATE acl 
  SET restApiRoute = '/api/frame-cart' 
  WHERE restApiRoute = '/api/cart'
`);
updateAcl.run();

const insertAcl = db.prepare(`
  INSERT OR IGNORE INTO acl (userRoles, method, restApiRoute, comment)
  VALUES (?, ?, ?, ?)
`);

const newAclRules = [
  ['visitor,user,admin', 'GET', '/api/frame-cart', 'Allow all users to see their frame cart'],
  ['visitor,user,admin', 'POST', '/api/add-frame-to-cart', 'Allow all users to add frames to cart'],
  ['visitor,user,admin', 'PUT', '/api/update-frame-in-cart', 'Allow all users to update frame quantities'],
  ['visitor,user,admin', 'DELETE', '/api/remove-frame-from-cart', 'Allow all users to remove frames from cart'],
  ['visitor,user,admin', 'DELETE', '/api/frame-cart', 'Allow all users to empty their frame cart']
];

const insertNewAcl = db.transaction((rules) => {
  for (const rule of rules) {
    insertAcl.run(...rule);
  }
});
insertNewAcl(newAclRules);

console.log('Frame cart system setup completed!');
console.log('\nNew tables and views created:');
console.log('- orderLines (updated for frame configurations)');
console.log('- orderRowDetails (view with all frame details)');
console.log('- orderRowDetails_en/sv/no (language-specific views)');
console.log('- orderTotals (order summary view)');

console.log('\nNew API endpoints:');
console.log('- GET /api/frame-cart - View cart');
console.log('- POST /api/add-frame-to-cart - Add frame configuration');
console.log('- PUT /api/update-frame-in-cart - Update quantities');
console.log('- DELETE /api/remove-frame-from-cart - Remove items');
console.log('- DELETE /api/frame-cart - Empty cart');

db.close();