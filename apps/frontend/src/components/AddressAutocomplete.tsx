import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { GeocodeResult, createDebouncedGeocodeSearch } from "@/services/geocode.service";
import { Loader2, MapPin, Search, AlertCircle } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (lat: number, lng: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onAddressChange,
  onCoordinatesChange,
  placeholder = "Enter address",
  disabled = false,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const debouncedSearchRef = useRef(createDebouncedGeocodeSearch(400));

  // Perform geocode search
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }

      setIsLoading(true);
      setOpen(true);
      try {
        const searchResults = await debouncedSearchRef.current(query);
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onAddressChange(newValue);
      handleSearch(newValue);
    },
    [onAddressChange, handleSearch],
  );

  // Handle selection of a result
  const handleSelect = useCallback(
    (result: GeocodeResult) => {
      onAddressChange(result.address);
      onCoordinatesChange(result.lat, result.lng);
      setOpen(false);
      setResults([]);
      setHoveredIndex(null);
    },
    [onAddressChange, onCoordinatesChange],
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHoveredIndex((prev) =>
            prev === null ? 0 : Math.min(prev + 1, results.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHoveredIndex((prev) =>
            prev === null ? results.length - 1 : Math.max(prev - 1, 0)
          );
          break;
        case "Enter":
          e.preventDefault();
          if (hoveredIndex !== null) {
            handleSelect(results[hoveredIndex]);
          }
          break;
        case "Escape":
          setOpen(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, results, hoveredIndex, handleSelect]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          onFocus={() => value && results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          aria-autocomplete="list"
          aria-controls="address-autocomplete-list"
          aria-expanded={open}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />
        )}
        {!isLoading && value && !isLoading && (
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
        )}
      </div>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
          id="address-autocomplete-list"
        >
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
              <span className="text-sm text-slate-600 font-medium">Searching Algeria...</span>
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="py-6 px-4 text-center">
              <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-medium">
                No address found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ul className="max-h-72 overflow-y-auto">
              {results.map((result, idx) => (
                <li key={`${result.address}-${idx}`}>
                  <button
                    type="button"
                    className={`w-full text-left px-4 py-3 transition-all border-b border-slate-100 last:border-b-0 flex items-start gap-3 ${
                      hoveredIndex === idx
                        ? "bg-blue-50 border-l-4 border-l-blue-500"
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    role="option"
                    aria-selected={hoveredIndex === idx}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <MapPin className={`w-4 h-4 ${
                        hoveredIndex === idx
                          ? "text-blue-600"
                          : "text-slate-400"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${
                        hoveredIndex === idx
                          ? "text-blue-900"
                          : "text-slate-900"
                      }`}>
                        {result.displayName || result.address}
                      </p>
                      <div className={`flex items-center gap-2 mt-1 text-xs ${
                        hoveredIndex === idx
                          ? "text-blue-700"
                          : "text-slate-500"
                      }`}>
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          📍 {result.lat.toFixed(4)}°N
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          {result.lng.toFixed(4)}°E
                        </span>
                      </div>
                    </div>
                    {hoveredIndex === idx && (
                      <div className="flex-shrink-0 text-blue-500">
                        <MapPin className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && results.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
              <span className="font-medium">{results.length}</span> address{results.length !== 1 ? "es" : ""} in Algeria
            </div>
          )}
        </div>
      )}
    </div>
  );
}
