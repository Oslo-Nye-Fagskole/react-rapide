# REST API Reference

## New Endpoints Added

### 1. Animals API
**Base Route**: `/api/:lang/animals`

- `GET /api/en/animals` - Get all animals in English
- `GET /api/sv/animals` - Get all animals in Swedish  
- `GET /api/no/animals` - Get all animals in Norwegian
- `GET /api/:lang/animals/:id` - Get specific animal by ID
- `POST /api/animals` - Create new animal (admin only)
- `PUT /api/animals/:id` - Update animal (admin only)
- `DELETE /api/animals/:id` - Delete animal (admin only)

**Fields**: id, name, slug, description, wikiUrl, imageAspectRatio, category
**Multilingual fields**: name, description, category

### 2. Frame Specifications API
**Base Route**: `/api/:lang/frameSpecifications`

- `GET /api/en/frameSpecifications` - Get all frame specifications in English
- `GET /api/sv/frameSpecifications` - Get all frame specifications in Swedish
- `GET /api/no/frameSpecifications` - Get all frame specifications in Norwegian
- `GET /api/:lang/frameSpecifications/:id` - Get specific specification by ID
- `POST /api/frameSpecifications` - Create new specification (admin only)
- `PUT /api/frameSpecifications/:id` - Update specification (admin only)
- `DELETE /api/frameSpecifications/:id` - Delete specification (admin only)

**Fields**: id, name, slug, frameWidthCm, frameHeightCm, imageAreaWidthCm, imageAreaHeightCm, matOpeningWidthCm, matOpeningHeightCm, description
**Multilingual fields**: name, description

### 3. Frame Materials API
**Base Route**: `/api/:lang/frameMaterials`

- `GET /api/en/frameMaterials` - Get all frame materials in English
- `GET /api/sv/frameMaterials` - Get all frame materials in Swedish
- `GET /api/no/frameMaterials` - Get all frame materials in Norwegian
- `GET /api/:lang/frameMaterials/:id` - Get specific material by ID
- `POST /api/frameMaterials` - Create new material (admin only)
- `PUT /api/frameMaterials/:id` - Update material (admin only)
- `DELETE /api/frameMaterials/:id` - Delete material (admin only)

**Fields**: id, name, slug, material, color, style, priceMultiplier, cssBackground
**Multilingual fields**: name, material, color, style

### 4. Frame Pricing API
**Base Route**: `/api/:lang/framePricing`

- `GET /api/en/framePricing` - Get all frame pricing
- `GET /api/sv/framePricing` - Get all frame pricing
- `GET /api/no/framePricing` - Get all frame pricing
- `GET /api/:lang/framePricing/:id` - Get specific pricing by ID
- `POST /api/framePricing` - Create new pricing (admin only)
- `PUT /api/framePricing/:id` - Update pricing (admin only)
- `DELETE /api/framePricing/:id` - Delete pricing (admin only)

**Fields**: frameSpecId, basePrice
**No multilingual fields**

## Language Support

**Supported languages**: 
- `en` - English (default)
- `sv` - Swedish
- `no` - Norwegian

**URL Structure**: All endpoints support language prefixes:
- `/api/en/...` - English content
- `/api/sv/...` - Swedish content  
- `/api/no/...` - Norwegian content

## ACL (Access Control List) Setup

### User Roles
- **visitor** - Not logged in users
- **user** - Logged in users
- **admin** - Administrative users

### Permissions Matrix

| Endpoint | visitor | user | admin |
|----------|---------|------|-------|
| GET (all tables) | ✅ | ✅ | ✅ |
| POST (create) | ❌ | ❌ | ✅ |
| PUT (update) | ❌ | ❌ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

### ACL Rules Added
- **Read access**: All users (including visitors) can read all animal, frame specification, material, and pricing data
- **Write access**: Only admins can create, update, or delete records
- **Language-agnostic**: ACL rules apply to all language versions of endpoints

## Data Examples

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

### Animal Response (Swedish)
```json
{
  "id": 1,
  "name": "Jordsvin",
  "slug": "aardvark",
  "description": "Jordsvin är medelstora, grävande...",
  "wikiUrl": "https://en.wikipedia.org/wiki/Aardvark",
  "imageAspectRatio": 1.44,
  "category": "Exotiska djur"
}
```

## Notes

- All multilingual fields automatically fall back to English if translation is missing
- The template.sqlite3 database is the source that gets copied to live.sqlite3 on startup
- ACL protection is enabled by default (see settings.json)
- All endpoints follow the same REST patterns as existing products API