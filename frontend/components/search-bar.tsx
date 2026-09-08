"use client";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { ChangeEvent } from "react";

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onEnter?: () => void;
  searchPlaceholder?: string;
}

export function SearchBar(props: SearchBarProps) {
  const { searchTerm, setSearchTerm, searchPlaceholder } = props;

  function clearSearch() {
    setSearchTerm("");
  }

  function handleChange(e: ChangeEvent<HTMLInputElement, HTMLInputElement>) {
    setSearchTerm(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      props.onEnter?.();
    }
  }
  return (
    <div className="relative w-full">
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-5 -translate-y-1/2" />
      <Input
        value={searchTerm}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={searchPlaceholder}
        className="ps-10 pe-10"
      />
      <XIcon
        className={cn(
          "text-muted-foreground absolute top-1/2 right-2.5 size-5 -translate-y-1/2 cursor-pointer transition-all duration-500",
          searchTerm === "" && "pointer-events-none opacity-0"
        )}
        onClick={clearSearch}
      />
    </div>
  );
}
