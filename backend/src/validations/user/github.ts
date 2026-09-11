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

const getRepoDetailsSchema = z.object({
  params: z.object({
    repoId: z.string().regex(/^\d+$/, "repoId must be a numeric string")
  })
});
export type GetRepoDetailsPayload = z.infer<typeof getRepoDetailsSchema>;
export const getRepoDetails = validate(getRepoDetailsSchema);

const updateRepoBranchesSchema = z.object({
  params: z.object({
    repoId: z.string().regex(/^\d+$/, "repoId must be a numeric string")
  }),
  body: z
    .object({
      targetBranches: z.array(z.string())
    })
    .strict()
});
export type UpdateRepoBranchesPayload = z.infer<
  typeof updateRepoBranchesSchema
>;
export const updateRepoBranches = validate(updateRepoBranchesSchema);

const fixRepoIssueSchema = z.object({
  params: z.object({
    repoId: z.string().regex(/^\d+$/, "repoId must be a numeric string")
  }),
  body: z
    .object({
      pullNumber: z.number().int().positive(),
      path: z.string().min(1),
      suggestion: z.string(),
      targetLine: z.number().int().positive().optional(),
      startLine: z.number().int().positive().optional(),
      commentId: z.number().int().positive().optional()
    })
    .strict()
});
export type FixRepoIssuePayload = z.infer<typeof fixRepoIssueSchema>;
export const fixRepoIssue = validate(fixRepoIssueSchema);
