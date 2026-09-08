import { SchemaConfig, Operator, DataType } from "@/types/filter-config.js";
import { FILTER_DELIMETER, ListOptions, ParsedFilter } from "./types.js";
import { PAGINATION } from "@/lib/constant.js";
import { Types } from "mongoose";

const RESERVED_KEYS = ["page", "limit", "sort", "populate", "search"];

function castValue(value: string, type: DataType): any {
  if (value === null || value === undefined || value === "") return value;

  switch (type) {
    case "number":
      return Number(value);
    case "boolean":
      return ["true", "1"].includes(String(value).toLowerCase());
    case "date":
      return new Date(value);
    case "objectId":
      return new Types.ObjectId(value);
    default:
      return String(value);
  }
}

function parsePagination(
  query: Record<string, any>
): ListOptions["pagination"] {
  const page = Math.max(1, parseInt(String(query.page), 10) || 1);
  const limit = Math.max(
    PAGINATION.MIN_LIMIT,
    Math.min(
      PAGINATION.MAX_LIMIT,
      parseInt(String(query.limit), 10) || PAGINATION.DEFAULT_LIMIT
    )
  );
  return { page, limit, skip: (page - 1) * limit };
}
function parseSort<T>(
  sortQuery: any,
  config: SchemaConfig<T>
): Record<string, 1 | -1> {
  const sort: Record<string, 1 | -1> = {};

  if (sortQuery) {
    const sortFields = String(sortQuery).split(",").filter(Boolean);

    for (const sortParam of sortFields) {
      const [field, order] = sortParam.trim().split(":");

      sort[field] = order?.toLowerCase() === "desc" ? -1 : 1;
    }
  } else if (config.defaultSort) {
    sort[String(config.defaultSort.field)] =
      config.defaultSort.order === "desc" ? -1 : 1;
  } else {
    sort[PAGINATION.DEFAULT_SORT] = -1;
  }

  return sort;
}

function parsePopulate(populateQuery: any): string[] {
  if (!populateQuery) return [];
  return String(populateQuery)
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}
function parseFilters<T>(
  query: Record<string, any>,
  config: SchemaConfig<T>
): ParsedFilter[] {
  const filters: ParsedFilter[] = [];
  const arrayOperators: Operator[] = ["in", "nin", "between"];

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

    if (!filterDef) continue;

    let valueStr = String(rawValue);
    if (filterDef.formatter) {
      valueStr = filterDef.formatter(valueStr);
    }

    let parsedValue: any;
    if (arrayOperators.includes(operator)) {
      parsedValue = valueStr
        .split(",")
        .map((v) => castValue(v.trim(), filterDef.dataType));
    } else {
      parsedValue = castValue(valueStr.trim(), filterDef.dataType);
    }

    filters.push({
      fieldPath,
      operator,
      value: parsedValue,
      dataType: filterDef.dataType
    });
  }

  return filters;
}

export function prepareListOptions<T>(props: {
  config: SchemaConfig<T>;
  query: Record<string, any>;
}): ListOptions {
  const { config, query } = props;

  return {
    pagination: parsePagination(query),
    sort: parseSort(query.sort, config),
    populate: parsePopulate(query.populate),
    search: query.search ? String(query.search).trim() : undefined,
    filters: parseFilters(query, config)
  };
}
