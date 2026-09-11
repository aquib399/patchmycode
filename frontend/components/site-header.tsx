"use client";

import Link from "next/link";
import Image from "next/image";
import { ToggleTheme } from "@/components/theme-toggle";
import { PaletteSelector } from "@/components/palette-toggle";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  className?: string;
  maxWidth?: string;
}

export function SiteHeader({
  className,
  maxWidth = "max-w-7xl"
}: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "border-border mx-auto flex h-20 w-full items-center justify-between border-b px-6 lg:px-8",
        maxWidth,
        className
      )}
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 font-mono text-sm font-medium tracking-tight transition-opacity hover:opacity-80"
      >
        <Image
          src="/logo.png"
          alt="PatchMyCode"
          width={24}
          height={24}
          priority
          className="size-6 object-contain"
        />
        <span className="tracking-wider">PATCH MY CODE</span>
      </Link>

      <div className="flex items-center gap-1.5">
        <ToggleTheme />
        <PaletteSelector />
      </div>
    </header>
  );
}
