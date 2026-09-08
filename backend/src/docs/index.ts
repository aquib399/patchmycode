import { userPaths } from "./paths/user/index.js";
import { BASE_URL, PORT } from "@/configs/env.js";
import { APP_NAME } from "@/lib/constant.js";

const DEFAULT_SUCCESS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    error: { type: "boolean", example: false },
    message: { type: "string", example: "Request successful" },
    data: { type: "object", additionalProperties: true }
  }
};

const DEFAULT_ERROR_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    error: { type: "boolean", example: true },
    message: { type: "string", example: "Request failed" },
    data: { type: "object", additionalProperties: true }
  }
};

function normalizeSwaggerPathSchemas(paths: Record<string, any>) {
  const methods = ["get", "post", "put", "patch", "delete", "all"];

  const normalized: Record<string, any> = {};

  for (const [path, pathItem] of Object.entries(paths)) {
    const item = { ...(pathItem || {}) };

    for (const method of methods) {
      const operation = item[method];
      if (!operation) continue;

      const normalizedOperation = { ...operation };
      const responses = { ...(normalizedOperation.responses || {}) };

      if (Object.keys(responses).length === 0) {
        responses["200"] = { description: "Request successful" };
      }

      for (const [code, response] of Object.entries(responses)) {
        const responseObj = { ...(response as Record<string, any>) };
        if (
          !responseObj.content ||
          !responseObj.content["application/json"]?.schema
        ) {
          const isSuccess = String(code).startsWith("2");
          responseObj.content = {
            ...(responseObj.content || {}),
            "application/json": {
              schema: isSuccess
                ? DEFAULT_SUCCESS_RESPONSE_SCHEMA
                : DEFAULT_ERROR_RESPONSE_SCHEMA
            }
          };
        }
        responses[code] = responseObj;
      }

      normalizedOperation.responses = responses;
      item[method] = normalizedOperation;
    }

    normalized[path] = item;
  }

  return normalized;
}

const rawPaths = {
  ...userPaths
};

export const swaggerSpec = {
  openapi: "3.0.0",

  info: {
    title: `${APP_NAME} - API Docs`,
    version: "1.0.0"
  },

  "x-tagGroups": [
    {
      name: "Admin",
      tags: [
        "admin-auth",
        "admin-tenant",
        "admin-staff",
        "admin-service-category",
        "admin-users",
        "admin-sse",
        "admin-profile"
      ]
    },
    {
      name: "Tenant",
      tags: [
        "tenant-auth",
        "tenant-profile",
        "tenant-role",
        "tenant-service",
        "tenant-staff",
        "tenant-service-provider"
      ]
    },
    {
      name: "Staff",
      tags: ["staff-auth", "staff-operations"]
    },
    {
      name: "Service Provider",
      tags: [
        "provider-auth",
        "provider-profile",
        "provider-availability",
        "provider-service",
        "provider-management"
      ]
    },
    {
      name: "User",
      tags: [
        "user-auth",
        "user-profile",
        "user-booking",
        "user-service-category",
        "user-service-provider",
        "user-service",
        "user-staff",
        "user-tenant",
        "user-review",
        "user-payment",
        "user-sse"
      ]
    },
    {
      name: "System",
      tags: ["system-media", "system-webhook"]
    }
  ],

  tags: [
    {
      name: "admin-auth",
      "x-displayName": "Auth",
      description: "Admin authentication endpoints"
    },
    {
      name: "admin-tenant",
      "x-displayName": "Tenant",
      description: "Admin tenant management endpoints"
    },
    {
      name: "admin-staff",
      "x-displayName": "Staff",
      description: "Admin staff management endpoints"
    },
    {
      name: "admin-service-category",
      "x-displayName": "Service Category",
      description: "Admin service category management"
    },
    {
      name: "admin-users",
      "x-displayName": "Users",
      description: "Admin user management endpoints"
    },
    {
      name: "admin-sse",
      "x-displayName": "SSE",
      description: "Admin server-sent events stream"
    },
    {
      name: "admin-profile",
      "x-displayName": "Admin",
      description: "Admin profile & verification endpoints"
    },

    {
      name: "tenant-auth",
      "x-displayName": "Auth",
      description: "Tenant auth & onboarding endpoints"
    },
    {
      name: "tenant-profile",
      "x-displayName": "Profile",
      description: "Tenant profile & verification endpoints"
    },
    {
      name: "tenant-role",
      "x-displayName": "Role",
      description: "Tenant custom role management"
    },
    {
      name: "tenant-service",
      "x-displayName": "Service",
      description: "Tenant service management"
    },
    {
      name: "tenant-staff",
      "x-displayName": "Staff",
      description: "Tenant staff management"
    },
    {
      name: "tenant-service-provider",
      "x-displayName": "Service Providers",
      description: "Tenant service provider management"
    },

    {
      name: "staff-auth",
      "x-displayName": "Auth",
      description: "Staff auth & onboarding endpoints"
    },
    {
      name: "staff-operations",
      "x-displayName": "Staff",
      description: "Staff team & profile operations"
    },

    {
      name: "provider-auth",
      "x-displayName": "Auth",
      description: "Service Provider auth & onboarding"
    },
    {
      name: "provider-profile",
      "x-displayName": "Profile",
      description: "Service Provider profile management"
    },
    {
      name: "provider-availability",
      "x-displayName": "Availability",
      description: "Service Provider working hours & availability"
    },
    {
      name: "provider-service",
      "x-displayName": "Services",
      description: "Service Provider service assignment & toggle"
    },
    {
      name: "provider-management",
      "x-displayName": "Service Providers",
      description: "Service Provider team management"
    },

    {
      name: "user-auth",
      "x-displayName": "Auth",
      description: "User auth & signup/signin"
    },
    {
      name: "user-profile",
      "x-displayName": "Profile",
      description: "User profile management"
    },
    {
      name: "user-booking",
      "x-displayName": "Booking",
      description: "User booking management"
    },
    {
      name: "user-service-category",
      "x-displayName": "Service Categories",
      description: "User category browsing"
    },
    {
      name: "user-service-provider",
      "x-displayName": "Service Providers",
      description: "User provider discovery"
    },
    {
      name: "user-service",
      "x-displayName": "Services",
      description: "User service discovery"
    },
    {
      name: "user-staff",
      "x-displayName": "Staff",
      description: "User staff browsing"
    },
    {
      name: "user-tenant",
      "x-displayName": "Tenants",
      description: "User tenant browsing"
    },
    {
      name: "user-review",
      "x-displayName": "Reviews",
      description:
        "User review creation and listing for providers, salons, and bookings"
    },
    {
      name: "user-payment",
      "x-displayName": "Payment",
      description: "User payment processing via Card intent or Wallet"
    },
    {
      name: "user-sse",
      "x-displayName": "SSE",
      description: "User real-time event streaming"
    },

    {
      name: "system-media",
      "x-displayName": "Media",
      description: "System media upload endpoints"
    },
    {
      name: "system-webhook",
      "x-displayName": "Webhooks",
      description: "System webhook callbacks"
    }
  ],

  servers: [{ url: BASE_URL }, { url: `http://localhost:${PORT}` }],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {}
  },

  paths: {
    ...normalizeSwaggerPathSchemas(rawPaths)
  }
};
