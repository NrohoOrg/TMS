# Geocode Autocomplete Implementation Guide

## 📋 Overview

This guide provides step-by-step instructions to implement address autocomplete with automatic lat/lng population in the TMS task creation form.

---

## Phase 1: Verify Backend is Working ✅

### Step 1: Check API is Running

```bash
# Check if API is running
curl -s http://localhost:3001/health | head -5

# Expected response: should show health info
```

### Step 2: Test Geocode Endpoint

```bash
# Test the geocode search endpoint
curl "http://localhost:3001/api/geocode/search?q=Algiers%20Airport&limit=5"

# Expected response: Array of geocoded addresses with lat/lng
```

### Step 3: Test via test.rest

Open `test.rest` file and send this request:

```http
### Geocode Search - Search for addresses
GET {{baseUrl}}/geocode/search?q=Algiers%20Airport&limit=5
Content-Type: {{contentType}}
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
[
  {
    "placeId": "234839715",
    "displayName": "Algiers Airport, Algiers, Algeria",
    "lat": 36.69090565,
    "lng": 3.215217649,
    "type": "airport",
    "importance": 0.95
  }
]
```

---

## Phase 2: Create Autocomplete Component

### Step 1: Create Component File

**File:** `apps/frontend/src/components/AddressAutocomplete.tsx`

```typescript
"use client";

import { useEffect, useState, useRef } from "react";
import { useGeocodeSearch } from "@/features/dispatcher/hooks";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, MapPin } from "lucide-react";
import type { GeocodeResult } from "@/features/dispatcher/types";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Search address...",
  disabled = false,
  label,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch geocode suggestions
  const { data: suggestions = [], isLoading } = useGeocodeSearch(
    debouncedQuery
  );

  // Debounce input changes
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (inputValue.trim().length < 2) {
      setDebouncedQuery("");
      setOpen(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
      setOpen(true);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle suggestion selection
  const handleSelect = (suggestion: GeocodeResult) => {
    onChange(suggestion.displayName, suggestion.lat, suggestion.lng);
    setInputValue(suggestion.displayName);
    setOpen(false);
    setDebouncedQuery("");
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      
      <div className="relative">
        <Input
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => inputValue.length >= 2 && setOpen(true)}
          className={cn(
            "pr-10",
            disabled && "bg-gray-50 cursor-not-allowed"
          )}
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Dropdown suggestions */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg z-50">
          <ul className="max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.placeId}-${index}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors",
                    "border-b border-gray-100 last:border-b-0"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {suggestion.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
                        {suggestion.type && ` • ${suggestion.type}`}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No results message */}
      {open && !isLoading && debouncedQuery && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg p-4 text-sm text-muted-foreground">
          No addresses found for "{debouncedQuery}"
        </div>
      )}
    </div>
  );
}
```

---

## Phase 3: Update Task Form Component

### Step 1: Import Autocomplete Component

**File:** `apps/frontend/src/features/dispatcher/components/DispatcherTasks.tsx`

Add import at the top:

```typescript
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
```

### Step 2: Replace Address Inputs

Find the `TaskFormFields` component (around line 220) and replace:

**OLD CODE:**
```typescript
<div className="space-y-2">
  <Label>Pickup Address</Label>
  <Input
    required
    placeholder="Enter pickup location"
    value={form.pickupAddress}
    onChange={(e) => onChange({ pickupAddress: e.target.value })}
  />
</div>
<div className="space-y-2">
  <Label>Dropoff Address</Label>
  <Input
    required
    placeholder="Enter dropoff location"
    value={form.dropoffAddress}
    onChange={(e) => onChange({ dropoffAddress: e.target.value })}
  />
</div>
```

**NEW CODE:**
```typescript
<div className="space-y-2">
  <AddressAutocomplete
    label="Pickup Address"
    value={form.pickupAddress}
    placeholder="Search pickup location..."
    onChange={(address, lat, lng) => {
      onChange({
        pickupAddress: address,
        pickupLat: lat.toString(),
        pickupLng: lng.toString(),
      });
    }}
  />
</div>

<div className="space-y-2">
  <AddressAutocomplete
    label="Dropoff Address"
    value={form.dropoffAddress}
    placeholder="Search dropoff location..."
    onChange={(address, lat, lng) => {
      onChange({
        dropoffAddress: address,
        dropoffLat: lat.toString(),
        dropoffLng: lng.toString(),
      });
    }}
  />
</div>
```

### Step 3: Make Coordinates Read-Only

Find the latitude/longitude inputs (around line 255) and make them read-only:

**UPDATED CODE:**
```typescript
<div className="space-y-2">
  <Label>Pickup Lat</Label>
  <Input
    type="number"
    step="any"
    placeholder="36.75"
    value={form.pickupLat}
    readOnly
    className="bg-gray-50 cursor-not-allowed"
    title="Auto-populated from address search"
  />
</div>
<div className="space-y-2">
  <Label>Pickup Lng</Label>
  <Input
    type="number"
    step="any"
    placeholder="3.05"
    value={form.pickupLng}
    readOnly
    className="bg-gray-50 cursor-not-allowed"
    title="Auto-populated from address search"
  />
</div>

<div className="space-y-2">
  <Label>Dropoff Lat</Label>
  <Input
    type="number"
    step="any"
    placeholder="36.80"
    value={form.dropoffLat}
    readOnly
    className="bg-gray-50 cursor-not-allowed"
    title="Auto-populated from address search"
  />
</div>
<div className="space-y-2">
  <Label>Dropoff Lng</Label>
  <Input
    type="number"
    step="any"
    placeholder="3.10"
    value={form.dropoffLng}
    readOnly
    className="bg-gray-50 cursor-not-allowed"
    title="Auto-populated from address search"
  />
</div>
```

---

## Phase 4: Test Implementation

### Test 1: Component Renders
- [ ] Open task creation dialog
- [ ] Verify autocomplete inputs appear for pickup/dropoff
- [ ] Verify lat/lng fields are visible but read-only

### Test 2: Autocomplete Works
- [ ] Type "Algiers" in pickup address
- [ ] Wait 300ms for debounce
- [ ] Verify suggestions appear
- [ ] Verify each suggestion shows address, coordinates, and type

### Test 3: Selection Works
- [ ] Click on a suggestion
- [ ] Verify:
  - [ ] Address field updates
  - [ ] Lat field auto-populates
  - [ ] Lng field auto-populates
  - [ ] Dropdown closes
  - [ ] Fields are read-only

### Test 4: Form Submission
- [ ] Fill in all required fields:
  - [ ] Title
  - [ ] Task Date
  - [ ] Pickup Address (via autocomplete)
  - [ ] Dropoff Address (via autocomplete)
  - [ ] Times and deadline
  - [ ] Priority
- [ ] Submit form
- [ ] Verify task is created with correct coordinates

### Test 5: Edge Cases
- [ ] Type less than 2 characters (no API call)
- [ ] Type invalid address (show "no results")
- [ ] Close dropdown by clicking outside
- [ ] Press Escape to close dropdown
- [ ] Re-open and search different address

---

## Phase 5: Optimize & Polish (Optional)

### Add Keyboard Navigation

```typescript
const [selectedIndex, setSelectedIndex] = useState(-1);

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (!open || suggestions.length === 0) return;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      setSelectedIndex((i) => 
        i < suggestions.length - 1 ? i + 1 : i
      );
      break;
    case "ArrowUp":
      e.preventDefault();
      setSelectedIndex((i) => (i > 0 ? i - 1 : -1));
      break;
    case "Enter":
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelect(suggestions[selectedIndex]);
      }
      break;
    case "Escape":
      setOpen(false);
      break;
  }
};
```

### Add Search History

```typescript
const [searchHistory, setSearchHistory] = useState<GeocodeResult[]>([]);

// Show recent searches when input is focused but empty
if (inputValue.length === 0 && open && searchHistory.length > 0) {
  return (
    <div className="text-xs text-muted-foreground p-2">
      Recent searches:
      {/* Map searchHistory */}
    </div>
  );
}
```

---

## 🎯 Checklist

Phase 1: Backend Verification
- [ ] Health check passes
- [ ] Geocode endpoint returns data
- [ ] test.rest request works

Phase 2: Component Creation
- [ ] AddressAutocomplete component created
- [ ] Debouncing implemented
- [ ] Dropdown UI works
- [ ] Click-outside handling works

Phase 3: Form Integration
- [ ] Autocomplete imported
- [ ] Pickup input replaced
- [ ] Dropoff input replaced
- [ ] Lat/Lng fields read-only

Phase 4: Testing
- [ ] Component renders
- [ ] Autocomplete suggestions appear
- [ ] Selection auto-populates coordinates
- [ ] Form submission works
- [ ] Edge cases handled

Phase 5: Polish (Optional)
- [ ] Keyboard navigation
- [ ] Search history
- [ ] Better styling
- [ ] Loading states

---

## 🐛 Troubleshooting

### Issue: No suggestions appear

**Cause:** API not responding or query too short  
**Solution:** 
- Verify backend is running: `curl http://localhost:3001/health`
- Check browser console for errors
- Ensure query is at least 2 characters

### Issue: Lat/Lng not populating

**Cause:** onChange callback not wired correctly  
**Solution:**
- Check component props in DispatcherTasks
- Verify form state is being updated
- Check React DevTools to see state changes

### Issue: Dropdown stays open

**Cause:** Click-outside handler not working  
**Solution:**
- Check ref is attached to container
- Verify event listener cleanup in useEffect
- Check z-index is not causing click misses

### Issue: API rate limited (429 error)

**Cause:** Too many requests to backend  
**Solution:**
- Increase debounce delay (currently 300ms)
- Implement client-side caching
- Check Redis is running for rate limiting

---

## 📊 Performance Tips

1. **Debounce:** Set to 300ms (adjustable)
2. **Result Limit:** Backend default is 5 (good for UX)
3. **Caching:** Backend caches for 7 days
4. **Rate Limit:** 1 req/sec protected by Redis

---

## 🚀 Next Steps

1. Create the AddressAutocomplete component
2. Integrate into task form
3. Test end-to-end
4. Gather user feedback
5. Iterate on UX/styling

