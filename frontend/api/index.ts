import { fetchController, ApiRequestResult } from "@/utils/fetch-controller";
import { QueryParams, RequestProps } from "@/types/api";
import { showToast } from "@/utils/toast";

export const toQueryString = (query?: QueryParams): string | undefined => {
  if (!query) return undefined;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }

  const queryString = search.toString();
  return queryString.length > 0 ? queryString : undefined;
};

interface NormalizedError {
  message: string;
  status: number;
}

const normalizeError = (error: ApiRequestResult | unknown): NormalizedError => {
  const err = error as Partial<ApiRequestResult> & {
    message?: string;
    status?: number;
    cause?: {
      status?: number;
    };
  };
  const message =
    err.data?.data &&
    typeof err.data.data === "object" &&
    !Array.isArray(err.data.data)
      ? `${err.data.message}: ${Object.values(err.data.data).join(", ")}`
      : (err.data?.message ?? err.message ?? "An unexpected error occurred");

  const status = err.status ?? err.cause?.status ?? 400;

  return {
    message,
    status
  };
};

export const request = async <T>(
  props: RequestProps
): Promise<ApiRequestResult<T>> => {
  const { toastConfig, ...fetchProps } = props;
  try {
    const response = await fetchController<T>(fetchProps);

    const { error } = response.data;

    if (error) {
      if (!props.forceReturn) {
        throw response;
      }
    }
    showToast(response, props.toastConfig);
    return response;
  } catch (error) {
    console.warn("API request failed:", error);

    const { message, status } = normalizeError(error);

    const resp: ApiRequestResult<T> = {
      status,
      ok: false,
      data: {
        error: true,
        message,
        data: undefined
      }
    };

    showToast(resp, props.toastConfig);

    if (!props.forceReturn) {
      throw new Error(message || "An error occurred");
    }
    return {
      status,
      ok: false,
      data: {
        error: true,
        message,
        data: undefined
      }
    };
  }
};
