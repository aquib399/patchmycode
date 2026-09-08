"use client";

import { createContext, useContext, useEffect, useState } from "react";

export enum Palette {
  Neutral = "1",
  Indigo = "2",
  Emerald = "3",
  Garnet = "4",
  Golden = "5",
  Mustard = "6"
}

const PALETTES = Object.values(Palette);

const STORAGE_KEY = "palette";

type PaltteteOption = Array<{ name: string; value: Palette }>;

interface PaletteContextValue {
  palette: Palette;
  setPalette: (p: Palette) => void;
  cyclePalette: () => void;
  options: PaltteteOption;
}

const options: PaltteteOption = Object.entries(Palette).map(([key, value]) => ({
  name: key,
  value
}));

const PaletteContext = createContext<PaletteContextValue | null>(null);

function applyPalette(p: Palette) {
  document.documentElement.setAttribute("data-palette", p);
}

export default function PaletteProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [palette, setPaletteState] = useState<Palette>(Palette.Neutral);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Palette | null;
    const initial =
      stored && PALETTES.includes(stored) ? stored : Palette.Neutral;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaletteState(initial);
    applyPalette(initial);
  }, []);

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    applyPalette(p);
    localStorage.setItem(STORAGE_KEY, p);
  };

  const cyclePalette = () => {
    const next = PALETTES[(PALETTES.indexOf(palette) + 1) % PALETTES.length];
    setPalette(next);
  };

  return (
    <PaletteContext.Provider
      value={{ palette, setPalette, cyclePalette, options }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within PaletteProvider");
  return ctx;
}
