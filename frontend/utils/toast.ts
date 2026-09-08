import {
  ApiRequestResult,
  ToastBehaviorConfig,
  ToastConfig
} from "@/types/api";
import { toast } from "sonner";

type ToastType = "success" | "error";

function popToaster(
  type: ToastType,
  config?: ToastBehaviorConfig,
  fallbackMessage?: string,
  fallbackDescription?: string
) {
  if (!config?.enabled) return;

  const message = config?.customMessage || fallbackMessage;
  if (!message) return;

  const description = config?.customDescription || fallbackDescription;

  toast[type](message, {
    description,
    ...config?.props
  });
}

export function showToast(result: ApiRequestResult<any>, config?: ToastConfig) {
  const isError = result.data?.error || !result.ok;
  const type: ToastType = isError ? "error" : "success";
  const behaviorConfig = isError ? config?.error : config?.success;

  const fallbackTitle =
    result.data?.message ||
    (isError ? "An error occurred" : "Operation successful");

  let fallbackDescription: string | undefined = undefined;
  if (isError && result.data?.data && typeof result.data.data === "object") {
    fallbackDescription = Object.entries(result.data.data)
      .map(([field, msg]) => `${field.replace(/.*\./, "")}: ${msg}`)
      .join("\n");
  }

  popToaster(type, behaviorConfig, fallbackTitle, fallbackDescription);
}
