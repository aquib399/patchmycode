import { PipelineStage, Types } from "mongoose";

export type Operator =
  | "equals"
  | "not_equals"
  | "in"
  | "nin"
  | "contains"
  | "icontains"
  | "not_contains"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "empty"
  | "not_empty"
  | "between"
  | "starts_with"
  | "ends_with"
  | "array_length"
  | "object_keys_length"
  | "regex"
  | "nearby";

export type DataType = "string" | "number" | "boolean" | "objectId" | "date";

export type AutocompleteString<T> = Extract<keyof T, string>;

/**
 * Describes where the 2dsphere-indexed point for a `geo` filter lives.
 *
 * When `from` is omitted the point is on the collection being queried and the
 * filter becomes a `$geoNear` stage. When `from` is set the point lives on a
 * related collection (a service provider has no coordinates of its own — its
 * location is the salon it belongs to), so the geo search runs against that
 * collection first and its ids are matched back through `localField`.
 */
export interface GeoDef {
  /** Path of the 2dsphere index, e.g. "address.geo". */
  key: string;
  /** Collection holding the geo point. Omit when it is the queried one. */
  from?: string;
  /** Field on the queried collection referencing the foreign doc. */
  localField?: string;
  /** Field on the foreign collection referenced by `localField`. Default `_id`. */
  foreignField?: string;
  /** Extra match applied to the foreign/near query, e.g. `{ status: "verified" }`. */
  query?: Record<string, any>;
}

export interface FieldDef {
  operators: Operator[];
  dataType: DataType;
  enum?: Array<string | number>;
  formatter?: (value: string) => string;
  regex?: {
    pattern: RegExp;
    message?: string;
  };
  geo?: GeoDef;
}

export interface LookupDef {
  from: string;
  localField: string;
  foreignField: string;
  as: string;
  isArray?: boolean;
  pipeline?: Exclude<PipelineStage, PipelineStage.Merge | PipelineStage.Out>[];
}

export type ObjectIdKeys<T> = {
  [K in keyof T]: Extract<T[K], Types.ObjectId | Types.ObjectId[]> extends never
    ? never
    : K;
}[keyof T] &
  string;

export interface SchemaConfig<T> {
  search: AutocompleteString<T>[];
  // `string & {}` keeps autocomplete while allowing computed fields such as
  // the `distance` produced by a geo filter.
  allowedSorts: (AutocompleteString<T> | (string & {}))[];
  allowedPopulate: Partial<Record<ObjectIdKeys<T>, LookupDef[]>>;

  allowedFilters: Partial<
    Record<AutocompleteString<T> | (string & {}), FieldDef>
  >;

  defaultSort?: {
    field: AutocompleteString<T>;
    order: "asc" | "desc";
  };

  requiredFilters: Partial<Record<AutocompleteString<T>, FieldDef>>;
}

export type Filter = {
  field: string;
  operator: Operator;
  value: any;
};
