# Geocode Frontend Integration - Quick Reference

## What Was Done ✅

### Files Created
1. **`/apps/frontend/src/services/geocode.service.ts`**
   - Service for calling backend geocoding API
   - Exports: `geocodeSearch()`, `createDebouncedGeocodeSearch()`

2. **`/apps/frontend/src/components/AddressAutocomplete.tsx`**
   - Reusable autocomplete component
   - Shows address dropdown with coordinates
   - Auto-fills lat/lng on selection

### Files Modified
3. **`/apps/frontend/src/features/dispatcher/components/DispatcherTasks.tsx`**
   - Imported `AddressAutocomplete` component
   - Replaced Pickup Address input → `<AddressAutocomplete>`
   - Replaced Dropoff Address input → `<AddressAutocomplete>`
   - Coordinates now auto-populate

---

## How It Works

```
Task Creation Form
├── Pickup Address Field
│   └── <AddressAutocomplete>
│       ├── User types "Algiers..."
│       ├── API calls backend: GET /api/geocode/search?query=Algiers
│       ├── Shows dropdown with results
│       └── On selection → Auto-fill pickupLat + pickupLng
│
└── Dropoff Address Field
    └── <AddressAutocomplete>
        └── Same flow as pickup
```

---

## Using AddressAutocomplete Component

### Import
```typescript
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
```

### Usage
```tsx
<AddressAutocomplete
  value={form.pickupAddress}                    // Current address text
  onAddressChange={(address) => {               // When user types or selects
    setForm(prev => ({ ...prev, pickupAddress: address }))
  }}
  onCoordinatesChange={(lat, lng) => {          // When user selects from dropdown
    setForm(prev => ({ 
      ...prev, 
      pickupLat: String(lat), 
      pickupLng: String(lng) 
    }))
  }}
  placeholder="Enter pickup location"           // Optional
  disabled={false}                              // Optional
/>
```

---

## Backend Integration

### Endpoint Used
```
GET /api/geocode/search?query={address}
```

### Response Format
```json
[
  {
    "address": "Full address string",
    "lat": 36.691,
    "lng": 3.215,
    "displayName": "Display name"
  }
]
```

---

## Features

| Feature | Status |
|---------|--------|
| Address autocomplete | ✅ |
| Debounced search (400ms) | ✅ |
| Auto-fill coordinates | ✅ |
| Loading indicator | ✅ |
| Keyboard accessible | ✅ |
| Error handling | ✅ |
| Responsive UI | ✅ |

---

## Testing

### Test in Browser
1. Go to frontend (http://localhost:3000)
2. Click "Create Task" button
3. Start typing in "Pickup Address" field
4. Verify dropdown appears after ~400ms
5. Click on address
6. Verify Lat/Lng fields auto-fill

### Test with cURL
```bash
curl "http://localhost:3001/api/geocode/search?query=Algiers%20Airport"
```

Expected response:
```json
[
  {
    "address": "Algiers Airport Terminal 1, Algeria",
    "lat": 36.691,
    "lng": 3.215,
    "displayName": "Algiers Airport"
  }
]
```

---

## Configuration

### Adjust Debounce Delay
In `AddressAutocomplete.tsx` line ~45:
```typescript
// Change 400 to desired milliseconds
const debouncedSearchRef = useRef(createDebouncedGeocodeSearch(400));
```

### Add to Other Components
The `AddressAutocomplete` component is reusable. Use it anywhere you need address inputs!

---

## How Coordinates Auto-Fill Works

1. **User selects address** from dropdown
2. **`handleSelect()` is called** with GeocodeResult
3. **`onCoordinatesChange` fires** with (lat, lng)
4. **Parent component updates** its form state
5. **Lat/Lng input fields** display new values

Example:
```typescript
const handleSelect = (result: GeocodeResult) => {
  onAddressChange(result.address);              // "Algiers Airport..."
  onCoordinatesChange(result.lat, result.lng);  // Auto-fill: 36.691, 3.215
}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Dropdown doesn't appear | Check browser console, verify API endpoint works |
| Coordinates not auto-filling | Check `onCoordinatesChange` callback is connected |
| Search is slow | Increase debounce: `createDebouncedGeocodeSearch(600)` |
| No results found | Verify backend endpoint returns proper format |

---

## Next Steps (Optional)

1. **Add to other components** - Any address field can use `AddressAutocomplete`
2. **Result caching** - Cache searches to reduce API calls
3. **Recent locations** - Store and reuse recent addresses
4. **Map preview** - Show selected address on interactive map
5. **Batch geocoding** - Geocode addresses during CSV import

---

## Summary

✅ **Geocode frontend integration is complete!**

- Users can search for addresses by name
- Coordinates auto-populate on selection
- No more manual lat/lng entry errors
- Works in both Create and Edit task dialogs
- Fully accessible and responsive

Ready to test! 🚀

