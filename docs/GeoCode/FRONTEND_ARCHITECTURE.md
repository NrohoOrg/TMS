# Geocode Frontend Integration - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Next.js)                   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ DispatcherTasks.tsx (Task Management Component)           │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ Create Task Dialog                               │    │   │
│  │  │                                                  │    │   │
│  │  │  TaskFormFields Component                        │    │   │
│  │  │  ├─ Title Input                                 │    │   │
│  │  │  ├─ Task Date                                   │    │   │
│  │  │  │                                               │    │   │
│  │  │  ├─ 📍 Pickup Address (NEW)                    │    │   │
│  │  │  │   └─ AddressAutocomplete Component           │    │   │
│  │  │  │       ├─ Search Input                        │    │   │
│  │  │  │       ├─ Debounced API Call                  │    │   │
│  │  │  │       └─ Dropdown Results                    │    │   │
│  │  │  │                                               │    │   │
│  │  │  ├─ Pickup Lat (Auto-filled ✅)                │    │   │
│  │  │  ├─ Pickup Lng (Auto-filled ✅)                │    │   │
│  │  │  ├─ Pickup Time Window                          │    │   │
│  │  │  │                                               │    │   │
│  │  │  ├─ 📍 Dropoff Address (NEW)                   │    │   │
│  │  │  │   └─ AddressAutocomplete Component           │    │   │
│  │  │  │       ├─ Search Input                        │    │   │
│  │  │  │       ├─ Debounced API Call                  │    │   │
│  │  │  │       └─ Dropdown Results                    │    │   │
│  │  │  │                                               │    │   │
│  │  │  ├─ Dropoff Lat (Auto-filled ✅)               │    │   │
│  │  │  ├─ Dropoff Lng (Auto-filled ✅)               │    │   │
│  │  │  ├─ Dropoff Deadline                            │    │   │
│  │  │  ├─ Priority                                    │    │   │
│  │  │  └─ Notes                                       │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Services                                                   │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ geocode.service.ts                               │    │   │
│  │  │                                                  │    │   │
│  │  │  ├─ geocodeSearch(query)                        │    │   │
│  │  │  │   └─ Calls: apiClient.get(GEOCODE.SEARCH)   │    │   │
│  │  │  │                                               │    │   │
│  │  │  └─ createDebouncedGeocodeSearch(delayMs)      │    │   │
│  │  │      └─ Wraps search with debounce             │    │   │
│  │  │                                                  │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ api-client.ts (Axios)                            │    │   │
│  │  │                                                  │    │   │
│  │  │  ├─ Request Interceptor                         │    │   │
│  │  │  │   └─ Attaches JWT token                      │    │   │
│  │  │  │                                               │    │   │
│  │  │  └─ Response Interceptor                        │    │   │
│  │  │      └─ Unwraps { success, data } envelope    │    │   │
│  │  │                                                  │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/JSON
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS)                           │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ GeocodeController                                          │   │
│  │ GET /api/geocode/search?query={address}                  │   │
│  │                                                            │   │
│  │  ├─ Extract: query parameter                             │   │
│  │  ├─ Call: GeocodeService.search(query)                   │   │
│  │  └─ Return: GeocodeResult[]                              │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ GeocodeService                                             │   │
│  │                                                            │   │
│  │  ├─ search(query: string)                                │   │
│  │  │   ├─ Clean/validate query                            │   │
│  │  │   ├─ Call: NominatimClient.search(query)             │   │
│  │  │   ├─ Transform response                              │   │
│  │  │   └─ Return: GeocodeResult[]                         │   │
│  │  │                                                       │   │
│  │  └─ GeocodeResult Interface:                            │   │
│  │      {                                                  │   │
│  │        address: string,      // Full address           │   │
│  │        lat: number,          // Latitude               │   │
│  │        lng: number,          // Longitude              │   │
│  │        displayName: string   // Short name             │   │
│  │      }                                                  │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ External Service: Nominatim (OSM)                          │   │
│  │                                                            │   │
│  │  GET https://nominatim.openstreetmap.org/search         │   │
│  │  Returns: [                                              │   │
│  │    {                                                     │   │
│  │      name,                                              │   │
│  │      lat,                                               │   │
│  │      lon,                                               │   │
│  │      display_name                                       │   │
│  │    }                                                     │   │
│  │  ]                                                       │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
DispatcherTasks (Main Component)
│
├─ Create Task Dialog
│  │
│  └─ TaskFormFields
│     │
│     ├─ Title Input
│     │
│     ├─ Pickup Address
│     │  └─ AddressAutocomplete ✨
│     │     ├─ Input Field (with MapPin icon)
│     │     └─ Dropdown (when results available)
│     │
│     ├─ Pickup Lat (auto-filled from autocomplete)
│     ├─ Pickup Lng (auto-filled from autocomplete)
│     │
│     ├─ Dropoff Address
│     │  └─ AddressAutocomplete ✨
│     │     ├─ Input Field (with MapPin icon)
│     │     └─ Dropdown (when results available)
│     │
│     ├─ Dropoff Lat (auto-filled from autocomplete)
│     ├─ Dropoff Lng (auto-filled from autocomplete)
│     │
│     └─ Submit Button
│
└─ Edit Task Dialog
   │
   └─ TaskFormFields
      └─ Same as Create Dialog
```

---

## Data Flow Diagram

```
USER INPUT
    │
    ├─ Types: "Algiers"
    │
    └─ Event: onChange
       │
       ├─ AddressAutocomplete.handleInputChange()
       │  │
       │  ├─ onAddressChange("Algiers")  → Update form state
       │  │
       │  └─ handleSearch("Algiers")
       │     │
       │     ├─ setIsLoading(true)
       │     ├─ setOpen(true)
       │     │
       │     └─ debouncedSearchRef.current("Algiers")
       │        │
       │        ├─ Wait 400ms (debounce)
       │        │
       │        └─ geocodeSearch("Algiers")
       │           │
       │           ├─ API Call:
       │           │  GET /api/geocode/search?query=Algiers
       │           │
       │           └─ Backend Response:
       │              [
       │                {
       │                  address: "Algiers Airport...",
       │                  lat: 36.691,
       │                  lng: 3.215,
       │                  displayName: "Algiers Airport"
       │                },
       │                { ... more results ... }
       │              ]
       │
       ├─ setResults(response)
       ├─ setIsLoading(false)
       │
       └─ Render: Dropdown with 3+ results

USER SELECTS RESULT
    │
    └─ Click: "Algiers Airport (36.6910, 3.2150)"
       │
       └─ handleSelect(result)
          │
          ├─ onAddressChange(result.address)
          │  └─ Form: pickupAddress = "Algiers Airport..."
          │
          ├─ onCoordinatesChange(result.lat, result.lng)
          │  ├─ Form: pickupLat = "36.691"
          │  └─ Form: pickupLng = "3.215"
          │
          ├─ setOpen(false)
          └─ setResults([])

RESULT
    │
    └─ Form Fields Populated:
       ├─ Pickup Address: "Algiers Airport Terminal 1, Algeria"
       ├─ Pickup Lat: 36.691 ✅ (auto-filled)
       └─ Pickup Lng: 3.215 ✅ (auto-filled)
```

---

## State Management

```
AddressAutocomplete Component State:

┌──────────────────────────────────────────┐
│ State Variables                          │
├──────────────────────────────────────────┤
│ [open, setOpen]                          │
│   Boolean: Dropdown visibility           │
│   - false: collapsed                     │
│   - true: showing results                │
│                                          │
│ [results, setResults]                    │
│   GeocodeResult[]: Search results        │
│   - []: no results                       │
│   - [{...}, {...}]: list of addresses   │
│                                          │
│ [isLoading, setIsLoading]                │
│   Boolean: API call in progress          │
│   - true: showing spinner                │
│   - false: not loading                   │
│                                          │
│ debouncedSearchRef                       │
│   Ref: Debounced search function         │
│   - Prevents rapid API calls             │
│   - 400ms default delay                  │
│                                          │
└──────────────────────────────────────────┘
```

---

## API Request/Response

### Request
```http
GET /api/geocode/search?query=Algiers HTTP/1.1
Host: localhost:3001
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Response (Success)
```json
[
  {
    "address": "Algiers Airport Terminal 1, Algeria",
    "lat": 36.691,
    "lng": 3.215,
    "displayName": "Algiers Airport"
  },
  {
    "address": "Algiers Port, Algeria",
    "lat": 36.7538,
    "lng": 3.0588,
    "displayName": "Algiers Port"
  },
  {
    "address": "Algiers Central Station, Algeria",
    "lat": 36.7629,
    "lng": 3.0648,
    "displayName": "Central Station"
  }
]
```

### Response (No Results)
```json
[]
```

### Response (Error)
```json
{
  "success": false,
  "error": {
    "code": "GEOCODE_ERROR",
    "message": "Failed to geocode address"
  }
}
```

---

## Performance Metrics

```
┌─────────────────────────────────────────────────┐
│ Performance Characteristics                    │
├─────────────────────────────────────────────────┤
│ Debounce Delay:        400ms (default)          │
│ Typical Response Time: 200-500ms                │
│ Max Dropdown Height:   240px (60 results shown) │
│ Autocomplete Items:    Up to 10 results         │
│                                                 │
│ User Experience:                                │
│ ├─ Type "Algiers" (15 chars)                   │
│ │  └─ API calls: 1-2 (not 15!) ✅             │
│ │                                              │
│ ├─ See dropdown: ~600ms from first key        │
│ ├─ Select address: ~100ms to populate         │
│ └─ Submit task: ~500-1000ms create            │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## File Structure

```
/apps/frontend/src/
├─ components/
│  ├─ AddressAutocomplete.tsx          ← NEW (142 lines)
│  └─ ui/
│     └─ input.tsx
│
├─ services/
│  ├─ geocode.service.ts              ← NEW (47 lines)
│  ├─ api-client.ts                   (unchanged)
│  └─ api-endpoints.ts                (unchanged)
│
└─ features/
   └─ dispatcher/
      └─ components/
         └─ DispatcherTasks.tsx         ← MODIFIED (added import + component usage)
```

---

## Testing Workflow

```
┌─ API Testing
│  └─ curl http://localhost:3001/api/geocode/search?query=Algiers
│     └─ Verify response format
│
├─ Component Testing
│  ├─ Type in address field
│  ├─ Wait 400ms
│  ├─ Verify dropdown appears
│  ├─ Click result
│  └─ Verify lat/lng auto-fill
│
├─ Integration Testing
│  ├─ Create full task flow
│  ├─ Populate all fields via autocomplete
│  ├─ Submit form
│  └─ Verify task created in DB
│
└─ User Acceptance Testing
   ├─ Create task with autocomplete
   ├─ Edit task with autocomplete
   └─ Verify coordinates are accurate
```

---

## Summary

✅ **Complete end-to-end geocoding integration**
- Frontend addresses searchable
- Coordinates auto-populated
- No manual entry errors
- Efficient debounced API calls
- Accessible and responsive UI

