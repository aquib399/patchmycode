import { DataType, Operator } from "@/types/filter-config.js";

export interface ParsedFilter {
  fieldPath: string;
  operator: Operator;
  value: any;
  dataType: DataType;
}

export interface ListOptions {
  filters: ParsedFilter[];
  search?: string;
  populate: string[];
  sort: Record<string, 1 | -1>;
  pagination: {
    page: number;
    limit: number;
    skip: number;
  };
}
export const RESERVED_KEYS = ["page", "limit", "sort", "populate", "search"];

export const FILTER_DELIMETER = "__";
