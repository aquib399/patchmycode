"use client";

import { User, LayoutDashboard } from "lucide-react";
import { UserAPI } from "@/api/user";
import {
  SidebarLink,
  GenericSidebar
} from "@/components/layout/generic-sidebar";

const basePath = "/app";
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
    title: "Repositories",
    href: basePath,
    icon: LayoutDashboard,
    exact: true
  }
];

export function Sidebar() {
  return (
    <GenericSidebar
      title="PATCH MY CODE"
      icon={User}
      links={links}
      onLogout={() => handleLogout()}
      isPending={false}
      error={undefined}
    />
  );
}
