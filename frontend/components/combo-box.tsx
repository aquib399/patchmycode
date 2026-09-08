"use client";

import { AlertTriangle, Loader2, SearchX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

export interface SearchResult<T> {
  id: string;
  title: string;
  description: string;
  is_disabled?: boolean;
  disabled_reason?: string;
  data: T;
}

export interface ComboboxProps<T> {
  value: string;
  onChange: (val: string) => void;
  searchResults: SearchResult<T>[];
  onSelect: (opt: SearchResult<T>) => void;
  states?: {
    loading?: boolean;
    error?: string;
  };
  className?: string;
  disabled?: boolean;
  onClear?: () => void;
  placeholder?: string;
}

export default function Combobox<T>(props: ComboboxProps<T>) {
  const {
    value,
    onChange,
    searchResults,
    onSelect,
    disabled,
    states,
    className,
    onClear,
    placeholder
  } = props;

  const [focused, setFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      setFocused(false);
      setHighlightedIndex(-1);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [focused]);

  useEffect(() => {
    if (!focused) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocused(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [focused]);

  const showDropdown = focused && searchResults.length > 0;
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({
    opacity: 0
  });

  const updatePosition = () => {
    const el = rootRef.current ?? inputRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
      zIndex: 9999,
      opacity: 1
    });
  };

  useEffect(() => {
    if (!showDropdown) return;

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showDropdown]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(-1);
  }, [searchResults]);

  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-combobox-item]");
    items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const selectableResults = searchResults.filter((r) => !r.is_disabled);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < selectableResults.length - 1 ? prev + 1 : 0
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : selectableResults.length - 1
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const selected =
        highlightedIndex >= 0
          ? selectableResults[highlightedIndex]
          : selectableResults[0];
      if (selected) {
        onSelect(selected);
        setHighlightedIndex(-1);
        setFocused(false);
      }
    }
  };
  // useEffect(() => {
  //   if (!showDropdown) return;
  //   const el = inputRef.current;
  //   if (!el) return;

  //   const r = el.getBoundingClientRect();
  //   setDropdownStyle({
  //     position: "fixed",
  //     top: r.bottom + 4,
  //     left: r.left,
  //     width: r.width,
  //     zIndex: 9999,
  //   });
  // }, [showDropdown, value, searchResults.length]);

  const clear = () => {
    onChange("");
    onClear?.();
  };

  return (
    <div ref={rootRef} className={cn("relative")}>
      <Input
        ref={inputRef}
        value={value}
        disabled={disabled}
        placeholder={placeholder || "Search..."}
        onFocus={() => {
          setFocused(true);
          if (!value) onChange("");
        }}
        onChange={(e) => {
          onChange(e.target.value);
          if (!focused) setFocused(true);
        }}
        onKeyDown={handleKeyDown}
        className={cn("pr-10", value ? "pr-16" : "", className)}
      />

      {value && (
        <button
          type="button"
          aria-label="Clear selection"
          onMouseDown={(e) => {
            e.preventDefault();
            clear();
          }}
          disabled={disabled}
          className={cn(
            "absolute top-1/2 right-2 -translate-y-1/2",
            "inline-flex h-7 w-7 items-center justify-center rounded-md",
            "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showDropdown &&
        createPortal(
          <div
            ref={listRef}
            style={dropdownStyle}
            className="bg-card max-h-60 overflow-y-auto rounded-md border shadow-lg"
          >
            {searchResults.map((opt, idx) => {
              const selectableIdx = opt.is_disabled
                ? -1
                : selectableResults.indexOf(opt);

              const isHighlighted =
                selectableIdx >= 0 && selectableIdx === highlightedIndex;

              return (
                <div
                  key={idx}
                  data-combobox-item
                  title={opt.is_disabled ? opt.disabled_reason : undefined}
                  onMouseDown={() => {
                    if (opt.is_disabled) return;
                    onSelect(opt);
                    setHighlightedIndex(-1);
                    setFocused(false);
                  }}
                  onMouseEnter={() => {
                    if (!opt.is_disabled && selectableIdx >= 0) {
                      setHighlightedIndex(selectableIdx);
                    }
                  }}
                  className={cn(
                    "px-3 py-2 text-sm",
                    opt.is_disabled
                      ? "cursor-not-allowed opacity-45"
                      : isHighlighted
                        ? "bg-muted"
                        : "hover:bg-muted cursor-pointer transition-colors"
                  )}
                >
                  <p className="leading-tight font-medium">{opt.title}</p>

                  {opt.description && (
                    <p className="text-muted-foreground text-xs">
                      {opt.description}
                    </p>
                  )}

                  {opt.is_disabled && opt.disabled_reason && (
                    <p className="text-destructive mt-1 text-xs">
                      {opt.disabled_reason}
                    </p>
                  )}
                </div>
              );
            })}

            {searchResults.length === 0 &&
              !states?.loading &&
              !states?.error && (
                <div className="text-muted-foreground flex gap-1.5 px-3 py-2 text-sm">
                  <SearchX />
                  No results found
                </div>
              )}

            {states?.loading && (
              <div className="text-muted-foreground flex gap-1.5 px-3 py-2 text-sm">
                <Loader2 className="animate-spin" />
                Loading…
              </div>
            )}

            {states?.error && (
              <div className="text-destructive flex gap-1.5 px-3 py-2 text-sm">
                <AlertTriangle />
                {states.error}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
