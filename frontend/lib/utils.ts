import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export { cn } from "cn";

function redirectToSignin(router: AppRouterInstance, role: string = "") {
  if (typeof window === "undefined") return;
  const searchParams = new URLSearchParams(window.location.search);
  const currentPath = window.location.pathname + window.location.search;

  if (
    !searchParams.has("redirect") &&
    !window.location.pathname.endsWith("/sign-in") &&
    !window.location.pathname.endsWith("/sign-up")
  ) {
    searchParams.set("redirect", currentPath);
  }
  const query = searchParams.toString();
  const targetPath = role ? `/${role}/sign-in` : `/sign-in`;
  router.push(query ? `${targetPath}?${query}` : targetPath);
}

function redirectToHome(router: AppRouterInstance, defaultPath: string = "/") {
  if (typeof window === "undefined") return;
  const searchParams = new URLSearchParams(window.location.search);
  let redirectPath = searchParams.get("redirect");
  if (
    !redirectPath ||
    !redirectPath.startsWith("/") ||
    redirectPath.startsWith("//") ||
    redirectPath.includes("/sign-in") ||
    redirectPath.includes("/sign-up")
  ) {
    redirectPath = defaultPath;
  }
  router.push(redirectPath);
}

export const redirectUserToSignin = (router: AppRouterInstance) =>
  redirectToSignin(router, "");
export const redirectUserToHome = (router: AppRouterInstance) =>
  redirectToHome(router, "/main");

type DateTrunc = "dateTime" | "date" | "day" | "hour" | "minute" | "second";

export function formatDate(date: string | Date, truncType?: DateTrunc) {
  let dateObj: Date;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    dateObj = new Date(date);
  }

  if (!truncType) {
    truncType = "dateTime";
  }
  switch (truncType) {
    case "dateTime":
      const d = dateObj.getDate().toString().padStart(2, "0");
      const month = dateObj.toLocaleString("en-US", { month: "long" });
      const year = dateObj.getFullYear();
      const time = dateObj.toTimeString().split(" ")[0];
      return `${d} ${month} ${year} ${time}`;
    case "date":
      const m = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const day = dateObj.getDate().toString().padStart(2, "0");
      return `${dateObj.getFullYear()}/${m}/${day}`;
    case "day":
      return dateObj.getDate().toString().padStart(2, "0");
    case "hour":
      return dateObj.getHours().toString().padStart(2, "0");
    case "minute":
      return dateObj.getMinutes().toString().padStart(2, "0");
    case "second":
      return dateObj.getSeconds().toString().padStart(2, "0");
  }
}
