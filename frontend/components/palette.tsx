"use client";
import { Modal, ModalContent, ModalTrigger } from "@/components/modal";
import { usePalette } from "@/providers/palette";
import { Button } from "@/components/ui/button";
import { Check, Palette } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PaletteSelector() {
  const { palette, setPalette, options } = usePalette();
  const [paletteOpen, setPaletteOpen] = useState(false);
  return (
    <Modal open={paletteOpen} setOpen={setPaletteOpen}>
      <ModalTrigger>
        <Button
          variant="secondary"
          aria-label="Choose palette"
          title="Choose palette"
        >
          <Palette />
        </Button>
      </ModalTrigger>

      <ModalContent anchor className="min-w-44 p-1">
        <ul className="flex flex-col">
          {options.map((opt) => {
            const active = palette === opt.value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    setPalette(opt.value);
                    setPaletteOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <span>{opt.name}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      </ModalContent>
    </Modal>
  );
}
