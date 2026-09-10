import { NextFunction, Request, Response } from "express";
import { PERMISSIONS } from "@/lib/permissions.ts";
import { Role } from "@/types/role.ts";
declare global {
  interface AttachedLocals {
    id: string; // adminId, tenantId, staffId, customerId
    role: Role;
    exp: number; // expiry timestamp of the jwt.exp
  }
  interface RouterParams<B = unknown, Q = unknown, P = unknown> {
    body?: B;
    query?: Q;
    params?: P;
  }

  type routerFunction<T extends RouterParams = RouterParams> = (
    req: Request<
      T["params"] extends undefined ? any : T["params"],
      any,
      T["body"] extends undefined ? any : T["body"],
      T["query"] extends undefined ? any : T["query"]
    >,
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
