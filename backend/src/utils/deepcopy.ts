import { Types } from "mongoose";

export function deepCopy<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Types.ObjectId)
    return new Types.ObjectId(obj.toString()) as any;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags) as any;
  if (Array.isArray(obj)) return obj.map((item) => deepCopy(item)) as any;
  if (typeof obj === "object") {
    const copy: Record<string, any> = {};
    for (const key of Object.keys(obj as any)) {
      copy[key] = deepCopy((obj as any)[key]);
    }
    return copy as T;
  }
  return obj;
}
