// configs/index.ts

import { Operator } from "@/types/filter-config.js";

export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const phoneRegex = /^\+?[\d\s\-()]{4,15}$/;

export const stringOperators: Operator[] = [
  "equals",
  "not_equals",
  "in",
  "nin",
  "contains",
  "icontains",
  "not_contains",
  "empty",
  "not_empty",
  "starts_with",
  "ends_with",
  "regex"
];

export const numberOperators: Operator[] = [
  "equals",
  "not_equals",
  "in",
  "nin",
  "gt",
  "lt",
  "gte",
  "lte",
  "between",
  "empty",
  "not_empty"
];

export const booleanOperators: Operator[] = [
  "equals",
  "not_equals",
  "empty",
  "not_empty"
];

export const objectIdOperators: Operator[] = [
  "equals",
  "not_equals",
  "in",
  "nin",
  "empty",
  "not_empty"
];

export const dateOperators: Operator[] = [
  "equals",
  "not_equals",
  "gt",
  "lt",
  "gte",
  "lte",
  "between",
  "empty",
  "not_empty"
];

export const enumOperators: Operator[] = ["equals", "not_equals", "in", "nin"];

export const geoOperators: Operator[] = ["nearby"];
