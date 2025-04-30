import { z } from "zod";

export const userAttributesSchema = z.object({
	id: z.string().optional(),
	ip: z.number().optional(),
	ja4Fingerprint: z.string().optional(),
	headersFingerprint: z.string().optional(),
});

export type UserAttributes = z.infer<typeof userAttributesSchema>;
