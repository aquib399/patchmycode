"use client";

import { UserAPI } from "@/api/user";
import {
  SidebarLink,
  GenericSidebar
} from "@/components/layout/generic-sidebar";
import {
  User,
  LayoutDashboard,
  Rss,
  Store,
  Tags,
  Scissors,
  Users
} from "lucide-react";

const basePath = "";
async function handleLogout() {
  const response = await UserAPI.auth.signOut({
    payload: {},
    forceReturn: true,
    toastConfig: { error: { enabled: true }, success: { enabled: true } }
  });
  if (response.data.error) {
    console.error("Logout failed:", response.data.error);
    return;
  }
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/sign-in`;
}

const links: SidebarLink[] = [
  {
    title: "Dashboard",
    href: basePath,
    icon: LayoutDashboard,
    exact: true
  },
  {
    title: "Dummy Page",
    href: `${basePath}/dummy`,
    icon: Rss,
    exact: true
  },
  {
    title: "Bookings",
    href: `${basePath}/bookings`,
    icon: Rss,
    exact: true
  },
  {
    title: "Salons",
    href: `${basePath}/salons`,
    icon: Store,
    exact: true,
    children: [
      {
        title: "All Salons",
        href: `${basePath}/salons`,
        icon: Store,
        exact: true
      },
      {
        title: "Popular Salons",
        href: `${basePath}/salons/popular`,
        icon: Store,
        exact: true
      },
      {
        title: "Nearby Salons",
        href: `${basePath}/salons/nearby`,
        icon: Store,
        exact: true
      }
    ]
  },
  {
    title: "Categories",
    href: `${basePath}/service-categories`,
    icon: Tags,
    exact: true
  },
  {
    title: "Services",
    href: `${basePath}/services`,
    icon: Scissors,
    exact: true
  },
  {
    title: "Providers",
    href: `${basePath}/providers`,
    icon: Users,
    exact: true
  }
];

export function Sidebar() {
  return (
    <GenericSidebar
      title="User Portal"
      icon={User}
      links={links}
      onLogout={() => handleLogout()}
      isPending={false}
      error={undefined}
    />
  );
}
