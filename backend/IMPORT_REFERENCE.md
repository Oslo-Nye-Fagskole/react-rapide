# JSON Import Reference

## What was imported

1. **Animals** (10 records)
   - Fields: id, name, slug, description, wikiUrl, imageAspectRatio, category
   - Multilingual fields: name, description, category

2. **Frame Specifications** (5 records)
   - Fields: id, name, slug, various dimension fields
   - Multilingual fields: name, description

3. **Frame Materials** (5 records)
   - Fields: id, name, slug, material, color, style, priceMultiplier, cssBackground
   - Multilingual fields: name, material, color, style

4. **Frame Pricing** (5 records)
   - Fields: frameSpecId, basePrice
   - No multilingual fields

## API Endpoints

All new tables are automatically available via the REST API:

- `/api/en/animals` - Get all animals in English
- `/api/sv/animals` - Get all animals in Swedish
- `/api/no/animals` - Get all animals in Norwegian
- `/api/en/animals/1` - Get specific animal by ID

Same pattern for:
- `/api/:lang/frameSpecifications`
- `/api/:lang/frameMaterials`
- `/api/:lang/framePricing`

## Extending Translations

To add more translations, edit the `createMultilingualJson` function in `import-json-to-db.js`:

1. Add translations for more animal names
2. Add translations for more descriptions
3. Re-run the import script

## Notes

- Only first 10 animals were imported (for demo). To import all, remove `.slice(0, 10)` from the animals import
- The backend automatically extracts the correct language from JSON fields
- If a translation is missing, it falls back to English
- All multilingual fields are stored as JSON with structure: `{"en": "...", "sv": "...", "no": "..."}`