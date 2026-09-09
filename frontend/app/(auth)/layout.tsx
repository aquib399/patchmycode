"use client";

import { WithoutAuthLayout } from "@/components/layout/without-auth-layout";
import { useUserVerifyToken } from "@/hooks/api/user";
import { redirectUserToHome, redirectUserToSignin } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const query = useUserVerifyToken({});
  return (
    <WithoutAuthLayout
      query={query}
      onAuthenticated={redirectUserToHome}
      onUnauthenticated={redirectUserToSignin}
    >
      {children}
    </WithoutAuthLayout>
  );
}
