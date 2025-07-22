# Frame Cart System Documentation

## Overview

The frame cart system handles complex product configurations where each cart item is a combination of:
- **Animal image** (from `animals` table)
- **Frame specification** (size/dimensions from `frameSpecifications` table)  
- **Frame material** (color/style from `frameMaterials` table)
- **Mat option** (boolean - with or without mat)

## Database Schema

### Updated `orderLines` Table
```sql
CREATE TABLE orderLines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL,
  animalId INTEGER NOT NULL,           -- Links to animals table
  frameSpecId TEXT NOT NULL,           -- Links to frameSpecifications table
  frameMaterialId TEXT NOT NULL,       -- Links to frameMaterials table
  withMat INTEGER NOT NULL DEFAULT 1,  -- Mat option (1=with mat, 0=without mat)
  quantity INTEGER NOT NULL DEFAULT 1, -- Quantity of this exact configuration
  unitPrice REAL NOT NULL,            -- Calculated price per unit
  totalPrice REAL NOT NULL,           -- unitPrice * quantity
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id),
  FOREIGN KEY (animalId) REFERENCES animals(id),
  FOREIGN KEY (frameSpecId) REFERENCES frameSpecifications(id),
  FOREIGN KEY (frameMaterialId) REFERENCES frameMaterials(id)
);
```

### Views for Rich Cart Display

#### `orderRowDetails` - Complete Join
Contains all order line data with joined animal, frame spec, and material details in all languages.

#### `orderRowDetails_en/sv/no` - Language-Specific Views
Extract the appropriate language for each multilingual field:
- Animal name, category
- Frame specification name
- Material name, color, style

#### `orderTotals` - Order Summary
Provides order totals: item count, total quantity, total amount.

## API Endpoints

### 1. Add Frame to Cart
**POST** `/api/add-frame-to-cart`

**Request Body:**
```json
{
  "animalId": 1,
  "frameSpecId": "large-portrait",
  "frameMaterialId": "black-wood", 
  "withMat": true,
  "quantity": 1
}
```

**Response:** Updated cart contents

### 2. View Cart
**GET** `/api/frame-cart`

**Response:** Array of cart items + total row
```json
[
  {
    "itemType": "ITEM",
    "orderLineId": 1,
    "quantity": 1,
    "unitPrice": 299.00,
    "totalPrice": 299.00,
    "withMat": true,
    "animalName": "Chimpanzee",
    "animalSlug": "chimpanzee",
    "category": "Primates",
    "frameSpecName": "Large Portrait",
    "frameWidthCm": 52,
    "frameHeightCm": 72,
    "materialName": "Black Wood",
    "material": "Wood",
    "color": "Black",
    "style": "Modern",
    "cssBackground": "radial-gradient(...)"
  },
  {
    "itemType": "TOTAL",
    "orderId": 26,
    "quantity": 3,
    "totalPrice": 847.50
  }
]
```

### 3. Update Quantity
**PUT** `/api/update-frame-in-cart`

**Request Body:**
```json
{
  "orderLineId": 1,
  "quantity": 2
}
```

### 4. Remove Item
**DELETE** `/api/remove-frame-from-cart/:orderLineId`

### 5. Empty Cart
**DELETE** `/api/frame-cart`

## Pricing Algorithm

### Price Calculation
```javascript
function calculateFramePrice(basePrice, priceMultiplier, withMat = true) {
  let price = basePrice * priceMultiplier;
  // Mat adds 20% to the price
  if (withMat) {
    price = price * 1.2;
  }
  return Math.round(price * 100) / 100; // Round to 2 decimals
}
```

### Example Calculation
- Base price (large-portrait): 29.99 kr
- Material multiplier (black-wood): 1.0
- With mat: +20%
- **Final price**: 29.99 × 1.0 × 1.2 = 35.99 kr

## Cart Logic

### Duplicate Detection
Items are considered identical if they have the same:
- `animalId`
- `frameSpecId` 
- `frameMaterialId`
- `withMat` option

If an identical configuration is added, the quantity is increased rather than creating a duplicate line.

### Session Management
- Cart persists across browser sessions using `sessionID`
- When user logs in, session-based cart merges with user account
- Users can only access their own cart items

## Language Support

The cart system fully supports internationalization:
- All animal names, categories are localized
- Frame specification names are localized  
- Material names, colors, styles are localized
- API responses automatically use the language from the URL (`req.lang`)

## Frontend Integration

### Adding to Cart (Example)
```javascript
const addFrameToCart = async (config) => {
  const response = await fetch('/api/add-frame-to-cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      animalId: config.animalId,
      frameSpecId: config.frameSpecId, 
      frameMaterialId: config.frameMaterialId,
      withMat: config.withMat,
      quantity: 1
    })
  });
  return response.json();
};
```

### Viewing Cart
```javascript
const getCart = async (language = 'en') => {
  const response = await fetch(`/api/frame-cart`);
  return response.json();
};
```

## Recent Updates

### v1.1 - SQLite Compatibility & Response Cleanup
- **Fixed**: Boolean values converted to INTEGER (1/0) for SQLite compatibility
- **Improved**: TOTAL items in cart responses now have null values filtered out for cleaner JSON
- **Maintained**: All functionality and API compatibility

### Response Cleanup
The system automatically removes null properties from TOTAL summary items, resulting in cleaner responses:

**Before**: TOTAL items had 20+ null properties  
**After**: TOTAL items only include relevant fields (`orderId`, `quantity`, `totalPrice`, `itemType`)

## Migration Notes

- **Removed**: Old simple product-based cart system
- **Removed**: `products` table dependencies from cart
- **Added**: Complex frame configuration support
- **Maintained**: Same session/user ownership logic
- **Maintained**: Same ACL security patterns

This system provides a much more sophisticated e-commerce experience suitable for a custom framing business where products are highly configurable rather than fixed inventory items.