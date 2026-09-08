import { NextFunction, Request, Response } from "express";
import { Role } from "@/types/role.ts";
import { PERMISSIONS } from "@/lib/permissions.ts";
declare global {
  interface AttachedLocals {
    id: string; // adminId, tenantId, staffId, customerId
    role: Role;
    exp: number; // expiry timestamp of the jwt.exp
  }

  type routerFunction<Body = any, Param = any, Query = any> = (
    req: Request<Param, any, Body, Query>,
    res: Response<ResponseData, AttachedLocals>,
    next?: any
  ) => Promise<Response<ResponseData>>;

  type routerRequest = Parameters<routerFunction>[0];
  type routerResponse = Parameters<routerFunction>[1];
  type routerNext = Parameters<routerFunction>[2];

  type serviceFunction<P, R> = (p: P) => Promise<ServiceResult<R>>;

  type ResponseData<T = any> =
    | { error: false; message: string; data: T }
    | { error: true; message: string; data: any };

  interface ServiceResult<T = any> {
    status: number;
    response: ResponseData<T>;
  }
}
