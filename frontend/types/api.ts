import { ApiResponse, FetchControllerProps } from "@/utils/fetch-controller";
import { ToastT } from "sonner";

export type ToastBehaviorConfig = {
  enabled: boolean;
  customMessage?: string;
  customDescription?: string;
  props?: ToastT;
};

export type ToastConfig = {
  error?: ToastBehaviorConfig;
  success?: ToastBehaviorConfig;
};

export interface ApiRequestResult<T = unknown> {
  data: ApiResponse<T>;
  status: number;
  ok: boolean;
}

export interface QueryParams {
  [key: string]: string;
}

export interface AdditionalRequestConfig {
  toastConfig?: ToastConfig;
  forceReturn?: boolean;
}

export type RequestProps = FetchControllerProps & AdditionalRequestConfig;

export type ApiFunctionProps<TPayload = void> = Omit<
  RequestProps,
  "method" | "endpoint" | "fullUrl" | "payload"
> &
  (TPayload extends void ? { payload?: never } : { payload: TPayload });

export type HookProps<T = void> = {
  queryParams?: Record<string, string>;
} & (T extends (...args: any) => any
  ? Parameters<T>[0] extends { payload: infer P }
    ? { payload: P }
    : { payload?: never }
  : T extends void
    ? { payload?: never }
    : { payload: T });
