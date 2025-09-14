import z from "zod";

export const amendmentSchema = z
    .object({
        title: z.string().min(1, "Missing title"),
        rationale: z.string().nullable().optional(),
        op: z.enum(["ADD", "EDIT", "REMOVE"]),
        treatySlug: z.string().default("league-treaty-1900"),
        targetArticleId: z.string().nullable().optional(),
        newHeading: z.string().nullable().optional(),
        newBody: z.string().nullable().optional(),
        newOrder: z.number().int().nullable().optional(),
    })
    .superRefine((data, ctx) => {
        if ((data.op === "REMOVE" || data.op === "EDIT") && !data.targetArticleId) {
            ctx.addIssue({
                code: "custom",
                path: ["targetArticleId"],
                message: "targetArticleId is required for EDIT/REMOVE",
            });
        }
        if ((data.op === "ADD" || data.op === "EDIT") && !data.newBody) {
            ctx.addIssue({
                code: "custom",
                path: ["newBody"],
                message: "newBody is required for ADD/EDIT",
            });
        }
    });