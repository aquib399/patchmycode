"use client";

import { WithAuthLayout } from "@/components/layout/with-auth-layout";
import { useUserProfile, useUserVerifyToken } from "@/hooks/api/user";
import { redirectUserToSignin } from "@/lib/utils";
import { Sidebar } from "./sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  const query = useUserVerifyToken({});
  useUserProfile({});
  return (
    <WithAuthLayout
      query={query}
      onUnauthorized={redirectUserToSignin}
      sidebar={<Sidebar />}
    >
      {children}
    </WithAuthLayout>
  );
}
