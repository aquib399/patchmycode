"use client";

import { Modal, ModalContent, ModalTrigger } from "@/components/modal";
import { motion, AnimatePresence } from "framer-motion";
import { PaletteSelector } from "../palette-toggle";
import { Button } from "@/components/ui/button";
import { ToggleTheme } from "../theme-toggle";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  X,
  Menu,
  Power,
  LucideIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export interface SidebarLink {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  openByDefault?: boolean;
  children?: SidebarLink[];
}

interface SidebarProps {
  title: string;
  icon: LucideIcon;
  links: SidebarLink[];
  extraComps?: React.ReactNode;
  onLogout: () => Promise<void>;
  error?: string;
  isPending?: boolean;
}

export function GenericSidebar({
  title,
  links,
  error,
  onLogout,
  isPending,
  extraComps,
  icon: TitleIcon
}: SidebarProps) {
  const pathname = usePathname();

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [expandedLinks, setExpandedLinks] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const getLinkState = (
    link: SidebarLink
  ): "active" | "ancestor" | "inactive" => {
    const isActive = link.exact
      ? pathname === link.href
      : pathname === link.href || pathname.startsWith(`${link.href}/`);

    if (isActive) return "active";

    if (link.children?.some((child) => getLinkState(child) !== "inactive")) {
      return "ancestor";
    }

    return "inactive";
  };

  const navClass = (link: SidebarLink) => {
    const state = getLinkState(link);

    return cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300",
      state === "active" && "bg-primary/10 text-primary font-medium",
      state === "ancestor" && "bg-primary/5 text-primary/70 font-medium",
      state === "inactive" &&
        "text-muted-foreground hover:bg-muted hover:text-foreground"
    );
  };

  const SidebarItem = ({
    link,
    level = 0,
    isMobile = false
  }: {
    link: SidebarLink;
    level?: number;
    isMobile?: boolean;
  }) => {
    const hasChildren = !!link.children?.length;
    const isAncestor = getLinkState(link) === "ancestor";
    const isOpen =
      expandedLinks[link.href] ?? (link.openByDefault || isAncestor);
    const isCollapsedState = !isMobile && collapsed;
    const renderContent = () => (
      <>
        <link.icon className="h-5 w-5 shrink-0" />
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300",
            isCollapsedState ? "max-w-0 opacity-0" : "max-w-50 opacity-100"
          )}
        >
          {link.title}
        </span>
      </>
    );

    const commonStyles = !isCollapsedState
      ? { paddingLeft: `${12 + level * 16}px` }
      : undefined;
    const commonClasses = cn(navClass(link), "w-full text-left");

    return (
      <>
        <div className="relative flex items-center">
          {hasChildren ? (
            <button
              type="button"
              className={commonClasses}
              title={link.title}
              style={commonStyles}
              onClick={() => {
                if (!isCollapsedState) {
                  setExpandedLinks((prev) => ({
                    ...prev,
                    [link.href]: !isOpen
                  }));
                }
              }}
            >
              {renderContent()}
            </button>
          ) : (
            <Link
              href={link.href}
              className={commonClasses}
              title={link.title}
              style={commonStyles}
              onClick={() => {
                if (isMobile) setMobileOpen(false);
              }}
            >
              {renderContent()}
            </Link>
          )}

          {hasChildren && !isCollapsedState && (
            <div className="text-muted-foreground pointer-events-none absolute right-2">
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-90"
                )}
              />
            </div>
          )}
        </div>

        {hasChildren &&
          !isCollapsedState &&
          isOpen &&
          link.children!.map((child) => (
            <SidebarItem
              key={child.href}
              link={child}
              level={level + 1}
              isMobile={isMobile}
            />
          ))}
      </>
    );
  };

  const renderNavAndFooter = (isMobile = false) => (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {links.map((link) => (
          <SidebarItem key={link.href} link={link} isMobile={isMobile} />
        ))}
      </nav>

      <div className="flex flex-col gap-2 p-4">
        {(!collapsed || isMobile) && extraComps}

        <div className="grid grid-cols-2 gap-2">
          <PaletteSelector />
          <ToggleTheme />
        </div>

        <Modal open={logoutOpen} setOpen={setLogoutOpen}>
          <ModalTrigger>
            <Button
              variant="destructive"
              className="flex w-full justify-center px-0 transition-all duration-300"
            >
              <Power className="size-4 shrink-0" />

              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-all duration-300",
                  !isMobile && collapsed
                    ? "w-0 max-w-0 opacity-0"
                    : "ml-2 max-w-30 opacity-100"
                )}
              >
                LOGOUT
              </span>
            </Button>
          </ModalTrigger>

          <ModalContent anchor grayscale>
            <div className="p-4">
              <p className="text-muted-foreground mb-4 text-sm">
                Are you sure you want to log out?
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLogoutOpen(false)}>
                  Cancel
                </Button>

                <Button
                  variant="destructive"
                  onClick={async () => {
                    await onLogout();
                    setLogoutOpen(false);
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      </div>
    </>
  );

  if (isPending) {
    return (
      <>
        {/* Mobile Header Skeleton */}
        <header className="border-border bg-card/80 flex h-14 max-h-14 min-h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-md lg:hidden">
          <div className="bg-muted h-6 w-32 animate-pulse rounded" />
        </header>

        {/* Desktop Sidebar Skeleton */}
        <aside
          className={cn(
            "border-border bg-card/50 sticky top-0 hidden h-screen animate-pulse flex-col border-r p-4 backdrop-blur-sm lg:flex",
            collapsed ? "w-20" : "w-72"
          )}
        >
          <div className="bg-muted mb-6 h-6 w-32 rounded" />
          <div className="flex-1 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted h-9 w-full rounded-lg" />
            ))}
          </div>
        </aside>
      </>
    );
  }

  if (error) {
    return (
      <>
        {/* Mobile Error Header */}
        <header className="border-border bg-card/80 text-destructive flex h-14 max-h-14 min-h-14 shrink-0 items-center justify-between border-b px-4 text-xs font-medium backdrop-blur-md lg:hidden">
          <span>{error}</span>
        </header>

        {/* Desktop Error Sidebar */}
        <aside
          className={cn(
            "border-border bg-card/50 sticky top-0 hidden h-screen flex-col items-center justify-center border-r p-4 text-center backdrop-blur-sm lg:flex",
            collapsed ? "w-20" : "w-72"
          )}
        >
          <p className="text-destructive px-2 text-xs font-medium">
            {collapsed ? "⚠️" : error}
          </p>
        </aside>
      </>
    );
  }

  return (
    <>
      {/* Mobile Top Header (< lg) */}
      <header className="border-border bg-card/80 flex h-14 max-h-14 min-h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2 overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <TitleIcon className="text-primary h-6 w-6 shrink-0" />
          <span className="text-foreground font-bold tracking-tight whitespace-nowrap">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <PaletteSelector />
          <ToggleTheme />
        </div>
      </header>

      {/* Mobile Drawer Overlay (< lg) with Hardware-Accelerated Animation */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-5 lg:hidden">
            {/* Backdrop Fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "linear" }}
              className="fixed inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer Content Slide-In From Left */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="border-border bg-card fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r shadow-2xl"
            >
              <div className="border-border flex h-14 max-h-14 min-h-14 shrink-0 items-center justify-between border-b px-4">
                <div className="flex items-center gap-2 overflow-hidden">
                  <TitleIcon className="text-primary h-6 w-6 shrink-0" />
                  <span className="font-bold tracking-tight whitespace-nowrap">
                    {title}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close Navigation Menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {renderNavAndFooter(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (lg: flex) */}
      <aside
        className={cn(
          "border-border bg-card/50 sticky top-0 hidden h-screen flex-col border-r backdrop-blur-sm transition-all duration-300 ease-in-out lg:flex",
          collapsed ? "w-20" : "w-72"
        )}
      >
        {/* Desktop Header */}
        <div className="border-border flex h-14 max-h-14 min-h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2 overflow-hidden transition-all duration-300">
            <TitleIcon className="text-primary h-6 w-6 shrink-0" />

            <span
              className={cn(
                "font-bold tracking-tight whitespace-nowrap transition-all duration-300",
                collapsed
                  ? "max-w-0 overflow-hidden opacity-0"
                  : "max-w-50 opacity-100"
              )}
            >
              {title}
            </span>
          </div>

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-2"
              onClick={() => setCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {renderNavAndFooter(false)}
      </aside>
    </>
  );
}
