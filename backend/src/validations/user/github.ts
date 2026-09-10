import { validate } from "@/middlewares/validation.js";
import z from "zod";

const toggleRepoStatusSchema = z.object({
  params: z.object({
    repoId: z.string().regex(/^\d+$/, "repoId must be a numeric string")
  }),
  body: z
    .object({
      isActive: z.boolean()
    })
    .strict()
});
export type ToggleRepoStatusPayload = z.infer<typeof toggleRepoStatusSchema>;
export const toggleRepoStatus = validate(toggleRepoStatusSchema);

const linkInstallationSchema = z.object({
  body: z
    .object({
      installationId: z.number().int().positive()
    })
    .strict()
});
export type LinkInstallationPayload = z.infer<typeof linkInstallationSchema>;
export const linkInstallation = validate(linkInstallationSchema);
