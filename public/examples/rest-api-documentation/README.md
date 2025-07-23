# REST API Reference - "Wilde Frames"

This reference covers all the API endpoints available for building an anonymous shopping experience.

**Tip:** To view JSON from GET-routes in a nice way in Chrome/Edge you can install [JSON Formatter](https://chromewebstore.google.com/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa).

## Available API Endpoints

### 1. Animals API
**Get all animals in a specific language:**
- `GET /api/en/animals` - Get all animals in English
- `GET /api/sv/animals` - Get all animals in Swedish
- `GET /api/no/animals` - Get all animals in Norwegian
- `GET /api/en/animals/:id` - Get specific animal by ID

**Fields**: id, name, slug, description, wikiUrl, imageAspectRatio, category

### 2. Frame Specifications API
**Get frame size options:**
- `GET /api/en/frameSpecifications` - Get all frame sizes in English
- `GET /api/sv/frameSpecifications` - Get all frame sizes in Swedish
- `GET /api/no/frameSpecifications` - Get all frame sizes in Norwegian
- `GET /api/en/frameSpecifications/:id` - Get specific frame size by ID

**Fields**: id, name, slug, frameWidthCm, frameHeightCm, imageAreaWidthCm, imageAreaHeightCm, matOpeningWidthCm, matOpeningHeightCm, description

### 3. Frame Materials API
**Get frame material options:**
- `GET /api/en/frameMaterials` - Get all frame materials in English
- `GET /api/sv/frameMaterials` - Get all frame materials in Swedish
- `GET /api/no/frameMaterials` - Get all frame materials in Norwegian
- `GET /api/en/frameMaterials/:id` - Get specific material by ID

**Fields**: id, name, slug, material, color, style, priceMultiplier, cssBackground

### 4. Frame Pricing API
**Get pricing information:**
- `GET /api/framePricing` - Get all frame pricing


**Fields**: frameSpecId, basePrice

### 5. Shopping Cart API
**Cart operations for the frame shopping system:**

**Add frame to cart:**
```http
POST /api/add-frame-to-cart
Content-Type: application/json

{
  "animalId": 1,
  "frameSpecId": "large-portrait",
  "frameMaterialId": "black-wood",
  "withMat": true,
  "quantity": 1
}
```

**View cart:**
```http
GET /api/frame-cart
```

**Update quantity:**
```http
PUT /api/update-frame-in-cart
Content-Type: application/json

{
  "orderLineId": 1,
  "quantity": 2
}
```

**Remove item from cart:**
```http
DELETE /api/remove-frame-from-cart/:orderLineId
```

**Empty cart:**
```http
DELETE /api/frame-cart
```

### 6. Exchange Rates
**Get current currency rates:**
- `GET /api/exchange-rates` - Get USD to NOK/SEK rates

## Language Support
**Note:** Names and categories, but not descriptions are translated for animals.

**Available languages**:
- `en` - English (default)
- `sv` - Swedish
- `no` - Norwegian

**URL Pattern**: Use language prefix in URLs:
- `/api/en/animals` - English content
- `/api/sv/animals` - Swedish content
- `/api/no/animals` - Norwegian content

## API Response Examples

### Animal Response (English)
```json
{
  "id": 1,
  "name": "Aardvark",
  "slug": "aardvark",
  "description": "Aardvarks are medium-sized, burrowing...",
  "wikiUrl": "https://en.wikipedia.org/wiki/Aardvark",
  "imageAspectRatio": 1.44,
  "category": "Exotic Animals"
}
```

### Cart Response
```json
[
  {
    "itemType": "ITEM",
    "orderLineId": 1,
    "quantity": 1,
    "unitPrice": 35.99,
    "totalPrice": 35.99,
    "withMat": 1,
    "animalName": "Aardvark",
    "animalSlug": "aardvark",
    "category": "Exotic Animals",
    "frameSpecName": "Large Portrait",
    "frameWidthCm": 52,
    "frameHeightCm": 72,
    "materialName": "Black Wood",
    "material": "Wood",
    "color": "Black",
    "style": "Modern",
    "cssBackground": "radial-gradient…"
  },
  {
    "itemType": "TOTAL",
    "orderId": 26,
    "quantity": 1,
    "totalPrice": 35.99
  }
]
```

## Building Your Shop

### Step 1: Display Animals
Fetch and display all animals for users to browse:
```javascript
const animals = await(await fetch('/api/en/animals')).json();
```

### Step 2: Show Frame Options
When user selects an animal, show frame and material options:
```javascript
const frameSpecs =
  await(await fetch('/api/en/frameSpecifications')).json();
const materials =
  await(await fetch('/api/en/frameMaterials')).json();
```

### Step 3: Add to Cart
When a user has configured their frame, add it to cart:
```javascript
const cart = await(await fetch('/api/add-frame-to-cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    animalId: selectedAnimal.id,
    frameSpecId: selectedFrame.id,
    frameMaterialId: selectedMaterial.id,
    withMat: includeMat,
    quantity: 1
  })
})).json();
```

### Step 4: Display Cart
Get the cart contents:
```javascript
const cart = await(await fetch('/api/frame-cart').json();
```

## Pricing Logic

Prices are calculated as:
1. **Base Price** (from framePricing table)
2. **× Material Multiplier** (from frameMaterials.priceMultiplier)
3. **× 1.2 if withMat is true** (mat adds 20%)

Example: 29.99 × 1.0 × 1.2 = 35.99 kr

## Data Available

- **225 animals** with full translations
- **5 frame specifications** (different sizes)
- **5 frame materials** (wood and metal options)
- **Complete pricing matrix**
- **3 languages** (English, Swedish, Norwegian)

All data is ready to use - just fetch from the API and build your frontend!