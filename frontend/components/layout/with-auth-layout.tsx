"use client";

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { UseQueryResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading";
import { useEffect } from "react";

interface WithAuthLayoutProps {
  query: UseQueryResult;
  onUnauthorized: (router: AppRouterInstance) => void;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function WithAuthLayout({
  sidebar,
  children,
  query,
  onUnauthorized
}: WithAuthLayoutProps) {
  const router = useRouter();
  useEffect(() => {
    if (query.isError) {
      onUnauthorized(router);
    }
  }, [query.isError, onUnauthorized, router]);

  if (!query.isSuccess) {
    return <Loading text="Authenticating..." />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      {sidebar}

      <section className="flex h-full min-h-0 w-full flex-col overflow-auto">
        {children}
      </section>
    </div>
  );
}
