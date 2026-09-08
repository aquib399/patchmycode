import { ObjectIdKeys, SchemaConfig } from "@/types/filter-config.js";
import { ListOptions, ParsedFilter } from "../query/types.js";
import { PipelineStage } from "mongoose";

export interface BuildMongoPipelineProps<T> {
  config: SchemaConfig<T>;
  listOptions: ListOptions;
  prePipeline?: PipelineStage[];
}

export const buildMongoPipeline = <T>({
  config,
  listOptions,
  prePipeline = []
}: BuildMongoPipelineProps<T>): PipelineStage[] => {
  const pipeline: PipelineStage[] = [...prePipeline];
  const matchStage: Record<string, any> = {};
  const lookupsAdded = new Set<string>();

  // 1. Populate (Lookups)
  for (const popPath of listOptions.populate) {
    const lookups = config.allowedPopulate?.[popPath as ObjectIdKeys<T>];
    if (!lookups) continue;

    for (const lookup of lookups) {
      const as = lookup.as;
      if (lookupsAdded.has(as)) continue;

      pipeline.push({
        $lookup: {
          from: lookup.from,
          localField: lookup.localField,
          foreignField: lookup.foreignField,
          as: as,
          ...(lookup.pipeline?.length ? { pipeline: lookup.pipeline } : {})
        }
      });

      if (!lookup.isArray) {
        pipeline.push({
          $unwind: { path: `$${as}`, preserveNullAndEmptyArrays: true }
        });
      }
      lookupsAdded.add(as);
    }
  }

  // 2. Filters
  for (const filter of listOptions.filters) {
    applyOperator(matchStage, filter);
  }

  // 3. Search
  if (listOptions.search && config.search?.length) {
    matchStage.$or = config.search.map((field) => ({
      [String(field)]: { $regex: listOptions.search, $options: "i" }
    }));
  }

  // 4. Apply Match
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // 5. Sort
  if (Object.keys(listOptions.sort).length > 0) {
    pipeline.push({ $sort: listOptions.sort });
  }

  // 6. Pagination & Facet
  pipeline.push({
    $facet: {
      metadata: [{ $count: "totalResults" }],
      results: [
        { $skip: listOptions.pagination.skip },
        { $limit: listOptions.pagination.limit }
      ]
    }
  });
  return pipeline;
};

const applyOperator = (
  matchStage: Record<string, any>,
  filter: ParsedFilter
) => {
  const { fieldPath: key, operator, value } = filter;

  switch (operator) {
    case "equals":
      matchStage[key] = value;
      break;
    case "not_equals":
      matchStage[key] = { $ne: value };
      break;
    case "in":
      matchStage[key] = { $in: value };
      break;
    case "nin":
      matchStage[key] = { $nin: value };
      break;
    case "contains":
      matchStage[key] = { $regex: value };
      break;
    case "icontains":
      matchStage[key] = { $regex: value, $options: "i" };
      break;
    case "not_contains":
      matchStage[key] = { $not: { $regex: value, $options: "i" } };
      break;
    case "gt":
      matchStage[key] = { ...matchStage[key], $gt: value };
      break;
    case "lt":
      matchStage[key] = { ...matchStage[key], $lt: value };
      break;
    case "gte":
      matchStage[key] = { ...matchStage[key], $gte: value };
      break;
    case "lte":
      matchStage[key] = { ...matchStage[key], $lte: value };
      break;
    case "between":
      matchStage[key] = { $gte: value[0], $lte: value[1] };
      break;
    case "empty":
      matchStage[key] = { $in: [null, "", []] };
      break;
    case "not_empty":
      matchStage[key] = { $nin: [null, "", []] };
      break;
    case "array_length":
      matchStage[key] = { $size: value };
      break;
    case "starts_with":
      matchStage[key] = { $regex: `^${value}`, $options: "i" };
      break;
    case "ends_with":
      matchStage[key] = { $regex: `${value}$`, $options: "i" };
      break;
    case "regex":
      matchStage[key] = { $regex: new RegExp(value) };
      break;
  }
};

export const createProjectStage = (
  fields: string[]
): Record<string, number> => {
  const base: Record<string, number> = {
    //
  };

  return fields.reduce((proj, field) => {
    proj[field] = 1;
    return proj;
  }, base);
};
