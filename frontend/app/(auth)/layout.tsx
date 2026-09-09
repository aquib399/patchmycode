"use client";

import { WithoutAuthLayout } from "@/components/layout/without-auth-layout";
import { redirectUserToHome } from "@/lib/utils";
import { useUserVerifyToken } from "@/hooks/api/user";

export default function Layout({ children }: { children: React.ReactNode }) {
  const query = useUserVerifyToken({});
  return (
    <WithoutAuthLayout
      query={query}
      onAuthenticated={redirectUserToHome}
    >
      {children}
    </WithoutAuthLayout>
  );
}
