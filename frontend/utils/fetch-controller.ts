import { API_BASE_URL } from "@/lib/constant";

const BASE_URL = API_BASE_URL;

interface BaseProps {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  queryParams?: Record<string, string>;
  payload?: Record<string, any> | FormData;
  cache?: RequestCache;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
}
interface withFullUrl {
  fullUrl: string;
  endpoint?: never;
}
interface withEndpoint {
  fullUrl?: never;
  endpoint: string;
}

export type FetchControllerProps = BaseProps & (withFullUrl | withEndpoint);
export interface ApiRequestResult<T = unknown> {
  data: ApiResponse<T>;
  status: number;
  ok: boolean;
}

export interface ApiResponse<T = unknown> {
  error: boolean;
  message: string;
  data?: T;
}
export const fetchController = async <T>({
  method,
  fullUrl,
  endpoint = "",
  headers = {},
  payload,
  signal,
  cache,
  credentials = "include",
  queryParams
}: FetchControllerProps): Promise<ApiRequestResult<T>> => {
  let apiUrl: string = fullUrl || `${BASE_URL}${endpoint}`;

  if (queryParams) {
    const queryString = new URLSearchParams(queryParams).toString();
    if (queryString) {
      apiUrl += apiUrl.includes("?") ? `&${queryString}` : `?${queryString}`;
    }
  }

  const config: RequestInit = {
    method,
    signal,
    credentials,
    cache: cache || (method === "GET" ? "default" : "no-store")
  };

  if (payload && method !== "GET") {
    if (payload instanceof FormData) {
      config.body = payload;
      config.headers = headers;
    } else {
      config.body = JSON.stringify(payload);
      config.headers = {
        "Content-Type": "application/json",
        ...headers
      };
    }
  } else {
    config.headers = {
      "Content-Type": "application/json",
      ...headers
    };
  }

  let response: Response;
  try {
    response = await fetch(apiUrl, config);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new Error("Network request failed. Please check your connection.", {
      cause: error
    });
  }

  const data = (await response.json()) as ApiResponse<T>;

  return { data, status: response.status, ok: response.ok };
};
