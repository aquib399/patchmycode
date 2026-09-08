"use client";

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { UseQueryResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading";
import { useEffect } from "react";

interface WithoutAuthLayoutProps {
  query: UseQueryResult;
  onAuthenticated: (router: AppRouterInstance) => void;
  onUnauthenticated?: (router: AppRouterInstance) => void;
  children: React.ReactNode;
}

export function WithoutAuthLayout({
  children,
  query,
  onAuthenticated
}: WithoutAuthLayoutProps) {
  const router = useRouter();

  useEffect(() => {
    if (query.isSuccess) {
      onAuthenticated(router);
    }
  }, [query.isSuccess, onAuthenticated, router]);

  if (query.isRefetching || query.isSuccess) {
    return <Loading />;
  }

  return children;
}
