"use client";

import { useTheme } from "next-themes";
import { Toaster, ToasterProps } from "sonner";

export function InitToast(props: ToasterProps) {
  const { theme } = useTheme();
  return <Toaster richColors theme={theme as any} {...props} />;
}
