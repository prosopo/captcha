import { z } from "zod";

export const userAttributesSchema = z.object({
	userId: z.string().optional(),
	ip: z.number().optional(),
	ja4Hash: z.string().optional(),
	headersHash: z.string().optional(),
	userAgentHash: z.string().optional(),
});

export type UserAttributes = z.infer<typeof userAttributesSchema>;
