"use client";
import { ApiFunctionProps, HookProps } from "@/types/api";
import { PaginatedResponse } from "@/types/pagination";
import { ApiResponse } from "@/utils/fetch-controller";
import { InfiniteData } from "@tanstack/react-query";

export type PaginatedApiResponse<T> = ApiResponse<PaginatedResponse<T>>;

export const getNextPageParam = <T>(
  lastPage: ApiResponse<PaginatedResponse<T>>
) => {
  return lastPage?.data?.next ?? undefined;
};

export const mergeInfinitePaginatedResponse = <T>(
  data: InfiniteData<PaginatedApiResponse<T>>
): PaginatedApiResponse<T> => {
  const pages = data?.pages ?? [];

  if (pages.length === 0) {
    return {
      error: false,
      message: "",
      data: {
        page: 1,
        totalPages: 1,
        limit: 0,
        totalResults: 0,
        next: null,
        previous: null,
        results: []
      }
    };
  }

  const lastPage = pages[pages.length - 1];
  const mergedResults = pages.flatMap((page) => page.data?.results ?? []);

  return {
    ...lastPage,
    data: {
      page: lastPage.data?.page ?? 1,
      totalPages: lastPage.data?.totalPages ?? 1,
      limit: lastPage.data?.limit ?? 0,
      totalResults: lastPage.data?.totalResults ?? 0,
      next: lastPage.data?.next ?? null,
      previous: lastPage.data?.previous ?? null,
      ...(lastPage.data ?? {}),
      results: mergedResults
    }
  };
};

type InferPayload<T> = T extends (...args: any) => any
  ? Parameters<T>[0] extends { payload: infer P }
    ? P
    : void
  : T;

interface BuildApiFunctionPropsArgs<T> {
  props: HookProps<T>;
  pageParam?: number;
}

export const buildApiFunctionProps = <T>(
  parms: BuildApiFunctionPropsArgs<T>
): ApiFunctionProps<InferPayload<T>> => {
  const { props, pageParam } = parms;
  return {
    ...props,
    queryParams: {
      ...props?.queryParams,
      ...(pageParam ? { page: String(pageParam) } : {})
    }
  } as ApiFunctionProps<InferPayload<T>>;
};
