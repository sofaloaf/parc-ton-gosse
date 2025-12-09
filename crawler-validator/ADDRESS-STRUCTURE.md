# Address Data Structure

## Overview

Addresses in Column E have been restructured to be:
- **Machine-readable**: JSON format for parsing by code/AI agents
- **Human-readable**: Clear, formatted display in Google Sheets
- **Well-organized**: Separated by conditions (days, age groups, class types)

## Structure

### 1. `addresses` Column (Human-Readable)
Main display format for humans. Shows addresses with conditions in a clear format:
```
1. Gymnase ROQUEPINE, 18 rue Roquépine, 75008 Paris (saturday)
2. Jardin du Luxembourg, terrasse des Reines de France, 75005 Paris (sunday)
```

### 2. `addresses_structured` Column (Machine-Readable)
JSON format for machines and AI agents. Each address is an object with:
```json
[
  {
    "address": "Gymnase ROQUEPINE, 18 rue Roquépine, 75008 Paris",
    "street": "18 rue Roquépine",
    "city": "Paris",
    "postalCode": "75008",
    "neighborhood": "8ème arrondissement",
    "days": ["saturday"],
    "ageMin": null,
    "ageMax": null,
    "classType": null,
    "time": null,
    "level": null,
    "notes": ""
  }
]
```

### 3. `addresses_display` Column
Formatted version for display in applications (same as `addresses` but kept separate for flexibility).

### 4. `addresses_original` Column
Original raw data for reference and debugging.

## Address Object Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `address` | string | Complete address string | "18 rue Roquépine, 75008 Paris" |
| `street` | string | Street address | "18 rue Roquépine" |
| `city` | string | City name | "Paris" |
| `postalCode` | string | Postal code | "75008" |
| `neighborhood` | string | Neighborhood/arrondissement | "8ème arrondissement" |
| `days` | array | Days when this address is used | ["monday", "wednesday"] |
| `ageMin` | number/null | Minimum age for this location | 4 |
| `ageMax` | number/null | Maximum age for this location | 12 |
| `classType` | string/null | Class type/level | "beginner", "advanced", "all levels" |
| `time` | string/null | Time slot | "14:30-15:30" |
| `level` | string/null | Skill level | "intermediate" |
| `notes` | string | Additional notes | "2ème étage" |

## Conditions

Addresses can have conditions that specify when/for whom they apply:

### Days
- Extracted from text: "lundi", "mardi", "mercredi", etc.
- Stored as: `["monday", "tuesday", "wednesday"]`

### Age Groups
- Extracted from: "4/7 ans", "8-12 ans", "4 à 7 ans"
- Stored as: `ageMin: 4, ageMax: 7`

### Class Types
- Extracted from: "débutant", "avancé", "tous niveaux", "adultes", "enfants"
- Stored as: `"beginner"`, `"advanced"`, `"all levels"`, `"adults"`, `"children"`

### Time Slots
- Extracted from: "20h00 à 21h30", "14:30-15:30"
- Stored as: `"20:00-21:30"`

## Usage Examples

### For Humans (Google Sheets)
Read the `addresses` column - it's formatted for easy reading.

### For Machines/Code
Parse the `addresses_structured` column (JSON):
```javascript
const addresses = JSON.parse(activity.addresses_structured);
addresses.forEach(addr => {
  console.log(`${addr.address} - ${addr.days.join(', ')}`);
});
```

### For AI Agents
Use the structured format to understand:
- Which address to use for specific days
- Which address for specific age groups
- Which address for specific class types
- Time slots for each location

## Best Practices

1. **Always check conditions**: Don't assume one address - check days, age, class type
2. **Use structured format**: Parse JSON for programmatic access
3. **Display human format**: Show `addresses` column to users
4. **Preserve original**: Keep `addresses_original` for reference

## Updating Addresses

Run the update script:
```bash
npm run update-addresses
```

This will:
1. Read current addresses
2. Parse and structure them
3. Extract conditions (days, age, class type, time)
4. Generate JSON format
5. Create human-readable display
6. Update all columns in Google Sheets

