"use client";

import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  useRef,
  useState,
  useContext,
  cloneElement,
  createContext,
  isValidElement,
  useLayoutEffect
} from "react";

interface ModalContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchorEl: HTMLElement | null;
  setAnchorEl: (el: HTMLElement | null) => void;
  confirmOnClose?: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("Modal components must be used within a Modal provider");
  }
  return context;
}

interface ModalProps {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  confirmOnClose?: boolean;
}

export function Modal({ children, open, setOpen, confirmOnClose }: ModalProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const isControlled = open !== undefined && setOpen !== undefined;
  const openState = isControlled ? open : localOpen;
  const setOpenState = isControlled ? setOpen : setLocalOpen;

  return (
    <ModalContext.Provider
      value={{
        open: openState,
        setOpen: setOpenState,
        anchorEl,
        setAnchorEl,
        confirmOnClose
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

interface ModalTriggerProps {
  children: React.ReactElement;
}

export function ModalTrigger({ children }: ModalTriggerProps) {
  const { setOpen, setAnchorEl } = useModal();

  if (!isValidElement(children)) {
    return children;
  }

  return cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      setAnchorEl(e.currentTarget as HTMLElement);
      setOpen(true);

      // @ts-expect-error don't want to interfere with existing onClick if it's already defined
      children.props.onClick?.(e);
    }
  } as any);
}

interface ModalContentProps {
  className?: string;
  children: React.ReactNode;
  anchor?: boolean;
  grayscale?: boolean;
}
export function ModalContent({
  children,
  className,
  anchor = false,
  grayscale = false
}: ModalContentProps) {
  const { open, setOpen, anchorEl, setAnchorEl, confirmOnClose } = useModal();

  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!open || !anchor || !anchorEl || !contentRef.current) {
        setPosition(null);
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const yOffset = 12;
      const xOffset = viewportWidth < 640 ? 12 : 24;

      const anchorRect = anchorEl.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();

      let top = anchorRect.bottom + yOffset;
      let left = anchorRect.left;

      if (top + contentRect.height > viewportHeight - yOffset) {
        top = anchorRect.top - contentRect.height - yOffset;
      }

      if (viewportWidth < 640) {
        left = Math.max(xOffset, (viewportWidth - contentRect.width) / 2);
      } else {
        if (left + contentRect.width > viewportWidth - xOffset) {
          left = viewportWidth - contentRect.width - xOffset;
        }
        if (left < xOffset) left = xOffset;
      }

      if (top < yOffset) top = yOffset;

      setPosition({ top, left });
    };

    updatePosition();

    if (open && anchor) {
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [open, anchor, anchorEl]);

  const closeModal = () => {
    setOpen(false);
    setAnchorEl(null);
    setPosition(null);
  };

  const handleOverlayClick = () => {
    if (confirmOnClose) {
      setConfirmOpen(true);
      return;
    }
    closeModal();
  };

  if (!open) return null;

  return createPortal(
    <>
      {/* MAIN MODAL */}
      <div
        ref={overlayRef}
        className={cn(
          "fixed inset-0 z-50 bg-black/40",
          !anchor && "flex items-center justify-center p-3 sm:p-5"
        )}
        style={
          grayscale
            ? {
                animation: "xp-stepped-fade 2s steps(10, end) forwards"
              }
            : undefined
        }
        onClick={handleOverlayClick}
      >
        {grayscale && (
          <style>{`
            @keyframes xp-stepped-fade {
              0% {
                backdrop-filter: grayscale(0%) brightness(100%);
              }
              100% {
                backdrop-filter: grayscale(100%) brightness(80%);
              }
            }
          `}</style>
        )}
        <div
          ref={contentRef}
          className={cn(
            "bg-card relative max-h-[92vh] max-w-[92vw] overflow-auto rounded-lg border shadow-xl",
            className
          )}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          style={
            anchor
              ? {
                  position: "absolute",
                  top: position?.top ?? 0,
                  left: position?.left ?? 0,
                  visibility: position ? "visible" : "hidden"
                }
              : undefined
          }
        >
          {children}
        </div>
      </div>

      {/* CONFIRM MODAL */}
      {confirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div
            className="bg-card min-w-75 rounded-lg border p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-muted-foreground mb-4 text-sm">
              Are you sure you want to close this modal?
            </p>

            <div className="flex justify-end gap-2">
              <button
                className="rounded-md border px-3 py-1.5"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>

              <button
                className="bg-destructive rounded-md px-3 py-1.5 text-white"
                onClick={() => {
                  setConfirmOpen(false);
                  closeModal();
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
