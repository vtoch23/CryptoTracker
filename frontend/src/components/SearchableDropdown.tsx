import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { CoinOption } from "../types";

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: CoinOption[];
  value: string;
  onChange: (coinId: string) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options.slice(0, 100);

    const searchLower = search.toLowerCase();
    const searchUpper = search.toUpperCase();
    const seen = new Set<string>();
    const result: CoinOption[] = [];

    options.forEach((opt) => {
      if (opt.symbol.toUpperCase() === searchUpper && !seen.has(opt.id)) {
        result.push(opt); seen.add(opt.id);
      }
    });

    options.forEach((opt) => {
      if (opt.id.toLowerCase() === searchLower && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });

    options.forEach((opt) => {
      if (opt.symbol.toLowerCase().startsWith(searchLower) && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });

    options.forEach((opt) => {
      if (opt.id.toLowerCase().startsWith(searchLower) && !seen.has(opt.id)) {
        result.push(opt);
        seen.add(opt.id);
      }
    });

    return result.slice(0, 20);
  }, [search, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400 pointer-events-none z-10" size={18} />
          <input
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400/50 transition"
          />
          {search && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearch("");
                onChange("");
              }}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition z-10"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-2xl max-h-64 overflow-y-auto z-[100]">
          {filtered.map((option, idx) => {
            const isExactSymbolMatch = option.symbol.toUpperCase() === search.toUpperCase();
            const isExactIdMatch = option.id.toLowerCase() === search.toLowerCase();
            const isExactMatch = isExactSymbolMatch || isExactIdMatch;

            return (
              <button
                key={`${option.id}-${idx}`}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setSearch(option.symbol);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-white text-left text-sm border-b border-slate-600 last:border-b-0 transition flex justify-between items-center ${isExactMatch
                    ? "bg-green-600/30 hover:bg-green-600/50"
                    : "hover:bg-slate-600"
                  }`}
              >
                <div>
                  <span className={`font-semibold ${isExactMatch ? "text-green-300" : ""}`}>
                    {option.symbol.toUpperCase()}
                  </span>
                  <span className="text-slate-400 text-xs ml-2">{option.id}</span>
                  {isExactMatch && <span className="text-green-300 text-xs ml-2">✓ Exact match</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && search && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-2xl p-4 z-[100]">
          <p className="text-slate-400 text-sm">
            No coins found matching "{search}". Try searching by:
            <br />• Symbol (e.g., BTC, ETH)
            <br />• Coin name (e.g., bitcoin, ethereum)
          </p>
        </div>
      )}
    </div>
  );
}

export default SearchableDropdown;
