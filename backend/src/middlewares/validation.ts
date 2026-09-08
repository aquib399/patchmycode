import { z, ZodError } from "zod";

type SchemaShape = {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  headers?: z.ZodTypeAny;
};

function replaceObjectContent(
  target: Record<string, any>,
  source: Record<string, any>
): void {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });

  Object.assign(target, source);
}

export const validate =
  (schema: z.ZodObject<SchemaShape>, customMessage?: string): routerFunction =>
  async (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers
      });

      if (parsed.body) {
        req.body = parsed.body as any;
      }

      if (parsed.query) {
        replaceObjectContent(
          req.query as Record<string, any>,
          parsed.query as Record<string, any>
        );
      }

      if (parsed.params) {
        replaceObjectContent(
          req.params as Record<string, any>,
          parsed.params as Record<string, any>
        );
      }

      if (parsed.headers) {
        Object.assign(
          req.headers as Record<string, any>,
          parsed.headers as Record<string, any>
        );
      }

      return next?.();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted: Record<string, string> = {};
        error.issues.forEach((e) => {
          const key = e.path.join(".");
          formatted[key] = e.message;
        });
        console.log("Validation error in request:", formatted);
        return res.status(422).json({
          error: true,
          message: customMessage || `Validation Error`,
          data: formatted
        });
      }

      console.error("Error in middlewares.validations.index", error);
      return res.status(500).json({
        error: true,
        message: "Validation Internal Server Error",
        data: null
      });
    }
  };
