# Geocode Feature - Architecture Diagrams

---

## 1️⃣ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Task Creation Form                                        │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Pickup Address: [AddressAutocomplete]               │ │ │
│  │  │ ┌─────────────────────────────────────────────────┐ │ │ │
│  │  │ │ User types: "Alg"                              │ │ │ │
│  │  │ │ (Wait 300ms debounce)                          │ │ │ │
│  │  │ │                                                 │ │ │ │
│  │  │ │ [▼] Suggestions:                              │ │ │ │
│  │  │ │ • Algiers Airport (36.69, 3.21)              │ │ │ │
│  │  │ │ • Algiers City Center (36.75, 3.05)          │ │ │ │
│  │  │ │ • Algiers Port (36.80, 3.02)                 │ │ │ │
│  │  │ │                                                 │ │ │ │
│  │  │ └─────────────────────────────────────────────────┘ │ │ │
│  │  │                                                        │ │ │
│  │  │ Pickup Lat: [36.691] (read-only)                    │ │ │
│  │  │ Pickup Lng: [3.215] (read-only)                     │ │ │
│  │  │                                                        │ │ │
│  │  │ Dropoff Address: [AddressAutocomplete]              │ │ │
│  │  │ Dropoff Lat: [Auto-filled]                          │ │ │
│  │  │ Dropoff Lng: [Auto-filled]                          │ │ │
│  │  │                                                        │ │ │
│  │  │ [Create Task] ──→ Submit with coordinates           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTP GET /api/geocode/search
                                  │ ?q=Alg&limit=5
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  GeocodeController                                         │ │
│  │  /api/geocode/search (GET)                               │ │
│  └────────────────────────┬─────────────────────────────────┘ │
│                           │                                    │
│  ┌────────────────────────▼─────────────────────────────────┐ │
│  │  GeocodeService                                          │ │
│  │  1. Normalize query → "alg"                             │ │
│  │  2. Check cache hit?                                     │ │
│  │     YES → Return results ✅                             │ │
│  │     NO → Proceed to 3                                   │ │
│  │  3. Acquire rate limit slot (Redis)                     │ │
│  │  4. Call Nominatim API                                  │ │
│  │  5. Transform results                                    │ │
│  │  6. Cache for 7 days (PostgreSQL)                       │ │
│  │  7. Return results                                       │ │
│  └────────────────────────┬─────────────────────────────────┘ │
│                           │                                    │
│            ┌──────────────┼──────────────┐                    │
│            ↓              ↓              ↓                    │
│  ┌─────────────────┐ ┌──────────┐ ┌──────────────────┐      │
│  │  PostgreSQL     │ │  Redis   │ │  Nominatim API   │      │
│  │  (7-day cache)  │ │(rate limit)│ (OpenStreetMap)  │      │
│  │                 │ │          │ │                  │      │
│  │ placeId: 123456 │ │Key: rate │ │ query: \"alg\"   │      │
│  │ query: \"alg\"  │ │EX: 1 sec │ │ Returns:         │      │
│  │ results: [...]  │ │NX: only  │ │ • coordinates    │      │
│  │ expiresAt: ...  │ │  if new  │ │ • address name   │      │
│  │                 │ │          │ │ • type (airport) │      │
│  └─────────────────┘ └──────────┘ └──────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Request/Response Flow

```
┌─ USER ACTION ──────────────────────────────────────────────────┐
│                                                                 │
│  User types "Algiers Airport" in Pickup Address field          │
│                    │                                             │
│                    ↓ (onChange fired)                            │
│            Frontend captures input                              │
│                    │                                             │
│                    ↓ (Debounce for 300ms)                       │
│            Start timer: 300ms countdown                         │
│                    │                                             │
│              (User types more or waits)                         │
│                    │                                             │
│                    ├─ If more typing → Reset timer             │
│                    │                                             │
│                    └─ If timer expires → Make API call         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─ API REQUEST ──────────────────────────────────────────────────┐
│                                                                 │
│  GET /api/geocode/search?q=algiers%20airport&limit=5           │
│                                                                 │
│  Headers:                                                       │
│  • Authorization: Bearer {token}                               │
│  • Content-Type: application/json                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─ BACKEND PROCESSING ───────────────────────────────────────────┐
│                                                                 │
│  1. Normalize query                                            │
│     "algiers airport" → "algiers airport"                      │
│                    │                                             │
│     2. Check PostgreSQL cache                                  │
│        │                                                        │
│        ├─ HIT (< 7 days old)                                  │
│        │  └─ Return cached results immediately ⚡             │
│        │                                                        │
│        └─ MISS                                                 │
│           └─ Proceed to step 3                                │
│                    │                                             │
│     3. Acquire Redis rate limit slot                           │
│        │                                                        │
│        ├─ ACQUIRED (slot available)                           │
│        │  └─ Proceed to step 4                                │
│        │                                                        │
│        └─ NOT ACQUIRED (rate limited)                         │
│           └─ Wait 1 second, retry step 3                      │
│                    │                                             │
│     4. Call Nominatim API                                      │
│        GET /search?q=algiers%20airport&...                    │
│        │                                                        │
│        └─ Receive results from OSM                             │
│                    │                                             │
│     5. Transform Nominatim results to TMS format               │
│        {place_id, lat, lon, ...} → {placeId, lat, lng, ...}  │
│                    │                                             │
│     6. Cache results in PostgreSQL                             │
│        Key: \"algiers airport\"                               │
│        TTL: 7 days from now                                    │
│                    │                                             │
│     7. Return results to frontend                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─ API RESPONSE ─────────────────────────────────────────────────┐
│                                                                 │
│  Status: 200 OK                                                │
│  Body:                                                          │
│  [                                                              │
│    {                                                            │
│      "placeId": "234839715",                                   │
│      "displayName": "Algiers Airport, Algiers, Algeria",       │
│      "lat": 36.69090565,                                       │
│      "lng": 3.215217649,                                       │
│      "type": "airport",                                        │
│      "importance": 0.95                                        │
│    },                                                           │
│    {                                                            │
│      "placeId": "5397",                                        │
│      "displayName": "Houari Boumedienne Airport",              │
│      "lat": 36.6892,                                           │
│      "lng": 3.2158,                                            │
│      "type": "airport",                                        │
│      "importance": 0.92                                        │
│    },                                                           │
│    ...                                                          │
│  ]                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─ FRONTEND PROCESSING ──────────────────────────────────────────┐
│                                                                 │
│  1. Receive response                                           │
│  2. Show dropdown with suggestions                             │
│  3. User clicks "Algiers Airport, Algiers, Algeria"           │
│                    │                                             │
│                    ↓                                             │
│  4. Selection handler called:                                  │
│     onChange(                                                   │
│       "Algiers Airport, Algiers, Algeria",                     │
│       36.69090565,    // latitude                              │
│       3.215217649     // longitude                              │
│     )                                                            │
│                    │                                             │
│                    ↓                                             │
│  5. Form state updated:                                        │
│     • pickupAddress: "Algiers Airport, Algiers, Algeria"      │
│     • pickupLat: 36.69090565                                   │
│     • pickupLng: 3.215217649                                   │
│                    │                                             │
│                    ↓                                             │
│  6. UI re-rendered:                                            │
│     • Address field shows selected address                     │
│     • Lat field shows 36.69090565 (read-only)                 │
│     • Lng field shows 3.215217649 (read-only)                 │
│     • Dropdown closes                                          │
│                    │                                             │
│                    ↓                                             │
│  7. User can now submit form with coordinates                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Cache Effectiveness

```
Time: Monday
├─ 10:00 - User searches "Algiers Airport"
│          └─ DB Cache: MISS → Nominatim API call
│             Result cached in PostgreSQL
│
├─ 11:00 - User searches "Algiers Airport" (again)
│          └─ DB Cache: HIT → Return in <50ms ✅
│
├─ 14:00 - Another user searches "Algiers Airport"
│          └─ DB Cache: HIT → Return in <50ms ✅
│
└─ 20:00 - User searches "Hotel Sofitel Algiers"
           └─ DB Cache: MISS → Nominatim API call
              Result cached in PostgreSQL

────────────────────────────────────────────────────────

Time: Tuesday
├─ 09:00 - User searches "Algiers Airport"
│          └─ DB Cache: HIT (still valid, 19h old) ✅
│
├─ 15:00 - User searches "Hotel Sofitel Algiers"
│          └─ DB Cache: HIT (still valid, 19h old) ✅
│
└─ 22:00 - User searches "Oran City Center" (new)
           └─ DB Cache: MISS → Nominatim API call

────────────────────────────────────────────────────────

Over 7 Days:
├─ Total searches: 1,000
├─ Cache hits: 950 (95%)
├─ Cache misses: 50 (5%)
├─ Nominatim API calls: 50 (instead of 1,000!)
└─ Result: 95% reduction in external API calls ⚡

Cache Expires After 7 Days:
└─ Monday: Oldest entry removed from cache
   New cache miss → Refresh from Nominatim
```

---

## 4️⃣ Rate Limiting Flow

```
Time: 10:00:00.000
└─ First request arrives
   ├─ Redis rate limit check: "nominatim:rate"
   ├─ Key does not exist
   ├─ Set key with 1 second expiration
   │  redis.set("nominatim:rate", "1", "EX", 1, "NX") → OK ✅
   ├─ Call Nominatim API immediately
   └─ Return results

────────────────────────────────────────────────────────

Time: 10:00:00.200
└─ Second request arrives (within 1 second)
   ├─ Redis rate limit check: "nominatim:rate"
   ├─ Key EXISTS (still valid for 800ms)
   ├─ Try to set key: redis.set(..., "NX") → NULL ❌
   ├─ Rate limit acquired = false
   ├─ Wait 1000ms
   └─ Return "TOO_MANY_REQUESTS" (429)

────────────────────────────────────────────────────────

Time: 10:00:01.000
└─ First request's rate limit key expires automatically
   ├─ Redis removes key after 1 second

────────────────────────────────────────────────────────

Time: 10:00:01.500
└─ Third request arrives
   ├─ Redis rate limit check: "nominatim:rate"
   ├─ Key does not exist (expired!)
   ├─ Set key with 1 second expiration → OK ✅
   ├─ Call Nominatim API
   └─ Return results

────────────────────────────────────────────────────────

Summary:
├─ 10:00:00.000 ─ Request 1: ALLOWED (slot acquired)
├─ 10:00:00.200 ─ Request 2: BLOCKED (within 1s)
├─ 10:00:01.500 ─ Request 3: ALLOWED (new slot available)
└─ Protection: Max 1 Nominatim API call per second
```

---

## 5️⃣ Data Transformation

```
NOMINATIM API RESPONSE
─────────────────────
{
  "place_id": 234839715,           ← Different field name
  "osm_type": "W",
  "osm_id": 272029328,
  "display_name": "Algiers Airport, Algiers, Algeria",
  "lat": "36.69090565",            ← STRING, not number!
  "lon": "3.215217649",            ← "lon" not "lng"!
  "boundingbox": [...],
  "class": "aeroway",
  "type": "aerodrome",             ← Different field name
  "importance": 0.95,
  "address": {...}
}

              ↓
        (TRANSFORMATION)
              ↓

TMS GEOCODE RESULT
──────────────────
{
  "placeId": "234839715",          ← Renamed
  "displayName": "Algiers Airport, Algiers, Algeria",
  "lat": 36.69090565,              ← Converted to number
  "lng": 3.215217649,              ← Renamed
  "type": "aerodrome",             ← Mapped from API
  "importance": 0.95,
  "address": {...}                 ← Optional
}

Frontend receives normalized, type-safe data ✅
```

---

## 6️⃣ Component Architecture

```
┌─────────────────────────────────────────────┐
│        DispatcherTasks Component            │
│  (Main task creation dialog)                │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ TaskFormFields Component             │  │
│  │                                      │  │
│  │  <div>                               │  │
│  │    <Label>Pickup Address</Label>    │  │
│  │    <AddressAutocomplete              │  │
│  │      value={pickupAddress}           │  │
│  │      onChange={handlePickupChange}  │  │
│  │    />                                │  │
│  │  </div>                              │  │
│  │                                      │  │
│  │  <div>                               │  │
│  │    <Label>Pickup Lat</Label>        │  │
│  │    <Input                            │  │
│  │      readOnly                        │  │
│  │      value={pickupLat}              │  │
│  │    />                                │  │
│  │  </div>                              │  │
│  │                                      │  │
│  │  <div>                               │  │
│  │    <Label>Pickup Lng</Label>        │  │
│  │    <Input                            │  │
│  │      readOnly                        │  │
│  │      value={pickupLng}              │  │
│  │    />                                │  │
│  │  </div>                              │  │
│  │                                      │  │
│  │  ... (repeat for dropoff) ...       │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ AddressAutocomplete Component        │  │
│  │ (NEW - to be created)                │  │
│  │                                      │  │
│  │  <div>                               │  │
│  │    <Input                            │  │
│  │      value={inputValue}              │  │
│  │      onChange={handleInput}          │  │
│  │      onFocus={handleFocus}           │  │
│  │    />                                │  │
│  │    {isLoading && <Spinner />}        │  │
│  │  </div>                              │  │
│  │                                      │  │
│  │  {open && (                          │  │
│  │    <div className="dropdown">       │  │
│  │      {suggestions.map(s => (       │  │
│  │        <button                       │  │
│  │          onClick={() =>              │  │
│  │            onChange(s.displayName, │  │
│  │                   s.lat, s.lng)     │  │
│  │        >                             │  │
│  │          {s.displayName}             │  │
│  │          ({s.lat}, {s.lng})          │  │
│  │        </button>                     │  │
│  │      ))}                             │  │
│  │    </div>                            │  │
│  │  )}                                  │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 7️⃣ State Flow

```
User Types "Alg"
    ↓
inputValue = "Alg"
    ↓
Debounce timer started (300ms)
    ↓
User waits (no more typing)
    ↓
Debounce timer fires
    ↓
debouncedQuery = "alg"
    ↓
useGeocodeSearch("alg") hook called
    ↓
Backend returns suggestions
    ↓
suggestions = [
  { placeId: "1", displayName: "Algiers", lat: 36.75, lng: 3.05 },
  { placeId: "2", displayName: "Algiers Airport", lat: 36.69, lng: 3.21 }
]
    ↓
open = true (show dropdown)
    ↓
Render suggestions dropdown
    ↓
User clicks "Algiers Airport"
    ↓
onChange("Algiers Airport", 36.69, 3.21) called
    ↓
Form state updated:
  pickupAddress = "Algiers Airport"
  pickupLat = 36.69
  pickupLng = 3.21
    ↓
UI re-rendered with values
    ↓
open = false (close dropdown)
    ↓
Form ready for submission ✅
```

---

These diagrams visualize the complete flow from user interaction to backend processing! 🎨

