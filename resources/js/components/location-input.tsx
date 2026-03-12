import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import GeocodeController from "@/actions/App/Http/Controllers/GeocodeController";
import { requestJson } from "@/lib/request-json";

interface LocationSuggestion {
  label: string;
  coordinates: { lat: number; lng: number };
}

interface LocationInputProps {
  value: string;
  coordinates: { lat: number; lng: number } | null;
  onChange: (location: string, coordinates: { lat: number; lng: number } | null) => void;
  placeholder?: string;
}

export function LocationInput({
  value,
  coordinates,
  onChange,
  placeholder = "Add a location...",
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = (query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await requestJson<LocationSuggestion[]>(
          "get",
          GeocodeController.url({ query: { query } }),
        );
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);
  };

  const handleChange = (newValue: string) => {
    onChange(newValue, null);
    fetchSuggestions(newValue);
  };

  const handleSelect = (suggestion: LocationSuggestion) => {
    onChange(suggestion.label, suggestion.coordinates);
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5">
        <MapPin
          className={`size-3 shrink-0 ${coordinates ? "text-primary" : "text-muted-foreground"}`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-7 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
        />
      </div>
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.coordinates.lat}-${suggestion.coordinates.lng}`}
              type="button"
              className={`w-full px-2 py-1.5 text-left text-xs ${
                index === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "text-popover-foreground hover:bg-accent/50"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="line-clamp-1">{suggestion.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
