import { number, object } from "zod";

export const FrictionlessPenalties = object({
	PENALTY_OLD_TIMESTAMP: number().positive().optional().default(0.2),
	PENALTY_ACCESS_RULE: number().positive().optional().default(0.5),
});
