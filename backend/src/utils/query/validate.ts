import { FILTER_DELIMETER, RESERVED_KEYS } from "./types.js";
import {
  FieldDef,
  Operator,
  DataType,
  SchemaConfig
} from "@/types/filter-config.js";

export interface ValidateConfigProps<T> {
  config: SchemaConfig<T>;
  query: Record<string, any>;
}

function validatePopulate<T>(
  populate: any,
  config: SchemaConfig<T>,
  errors: Record<string, string>
): void {
  const populateFields = String(populate)
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  for (const field of populateFields) {
    const lookup =
      config.allowedPopulate?.[field as keyof typeof config.allowedPopulate];

    if (!lookup) {
      errors["populate"] = `Populate not allowed for path: '${field}'`;
    }
  }
}

function validateSort<T>(
  sort: any,
  config: SchemaConfig<T>,
  errors: Record<string, string>
): void {
  const sortFields = String(sort).split(",").filter(Boolean);

  for (const sortParam of sortFields) {
    const [field, order] = sortParam.trim().split(":");

    if (
      config.allowedSorts?.length &&
      !config.allowedSorts.includes(field as any)
    ) {
      errors[`sort.${field}`] = `Sorting not allowed for '${field}'.`;
      continue;
    }

    if (order && !["asc", "desc"].includes(order.toLowerCase())) {
      errors[`sort.${field}`] =
        `Invalid sort order '${order}' for '${field}'. Use 'asc' or 'desc'.`;
    }
  }
}

function validateDataType(
  fieldPath: string,
  rawString: string,
  dataType: DataType,
  errors: Record<string, string>
): void {
  if (dataType === "number") {
    if (Number.isNaN(Number(rawString))) {
      errors[`body.${fieldPath}`] =
        `Invalid number value '${rawString}' for '${fieldPath}'.`;
    }
  }
  if (dataType === "date") {
    if (Number.isNaN(Date.parse(rawString))) {
      errors[`body.${fieldPath}`] =
        `Invalid date format '${rawString}' for '${fieldPath}'.`;
    }
  }
  if (dataType === "boolean") {
    if (
      rawString !== "true" &&
      rawString !== "false" &&
      rawString !== "1" &&
      rawString !== "0"
    ) {
      errors[`body.${fieldPath}`] =
        `Invalid boolean value '${rawString}' for '${fieldPath}'. Use 'true' or 'false'.`;
    }
  }
}

function validateEnum(
  fieldPath: string,
  rawString: string,
  allowedValues: Array<string | number>,
  errors: Record<string, string>
): void {
  const values = rawString.split(",").map((v) => v.trim());
  for (const val of values) {
    const asNum = Number(val);
    const isValid =
      allowedValues.includes(val) ||
      (!Number.isNaN(asNum) && allowedValues.includes(asNum));
    if (!isValid) {
      errors[`body.${fieldPath}`] =
        `Invalid value '${val}' for '${fieldPath}'. Allowed values: ${allowedValues.join(", ")}`;
    }
  }
}

function validateRegex(
  fieldPath: string,
  rawString: string,
  regexDef: NonNullable<FieldDef["regex"]>,
  errors: Record<string, string>
): void {
  const regex = regexDef.pattern;
  if (!regex.test(rawString)) {
    errors[`body.${fieldPath}`] =
      regexDef.message ||
      `Value '${rawString}' for '${fieldPath}' does not match required format.`;
  }
}

function validateFilters<T>(
  query: Record<string, any>,
  config: SchemaConfig<T>,
  providedFilters: Set<string>,
  errors: Record<string, string>
): void {
  for (const [key, rawValue] of Object.entries(query)) {
    if (RESERVED_KEYS.includes(key)) continue;

    const [fieldPath, operatorStr] = key.split(FILTER_DELIMETER);
    const operator = (operatorStr || "equals") as Operator;

    const filterDef =
      config.allowedFilters?.[
        fieldPath as keyof typeof config.allowedFilters
      ] ||
      config.requiredFilters?.[
        fieldPath as keyof typeof config.requiredFilters
      ];

    if (!filterDef) {
      errors[`body.${fieldPath}`] = `Filter not allowed: '${fieldPath}'`;
      continue;
    }

    providedFilters.add(fieldPath);

    if (!filterDef.operators.includes(operator)) {
      errors[`body.${fieldPath}`] =
        `Operator '${operator}' not allowed for '${fieldPath}'. Allowed: ${filterDef.operators.join(", ")}`;
      continue;
    }

    const rawString = String(rawValue);

    if (filterDef.dataType)
      validateDataType(fieldPath, rawString, filterDef.dataType, errors);
    if (filterDef.enum)
      validateEnum(fieldPath, rawString, filterDef.enum, errors);
    if (filterDef.regex)
      validateRegex(fieldPath, rawString, filterDef.regex, errors);
  }
}

export function validateQuery<T>({
  config,
  query
}: ValidateConfigProps<T>): Record<string, string> {
  const errors: Record<string, string> = {};
  const providedFilters = new Set<string>();

  // 1. Validate Populate
  if (query.populate) validatePopulate(query.populate, config, errors);

  // 2. Validate Search
  if (query.search && (!config.search || config.search.length === 0)) {
    errors["search"] = `Search is not supported on this endpoint.`;
  }

  // 3. Validate Sort
  if (query.sort) validateSort(query.sort, config, errors);

  // 4. Validate Filters
  validateFilters(query, config, providedFilters, errors);

  // 5. Validate Required Filters
  if (config.requiredFilters) {
    for (const reqField of Object.keys(config.requiredFilters)) {
      if (!providedFilters.has(reqField)) {
        errors[`body.${reqField}`] = `Missing required filter: '${reqField}'`;
      }
    }
  }

  return errors;
}
