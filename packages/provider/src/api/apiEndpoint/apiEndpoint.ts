import type { ApiResponse } from "@prosopo/types";
import type { z, ZodType } from "zod";

interface ApiEndpoint<T extends ZodType | undefined> {
	processRequest: T extends ZodType
		? (args: z.infer<T>) => Promise<ApiResponse>
		: () => Promise<ApiResponse>;

	getRequestArgsSchema(): T;
}

export type { ApiEndpoint };
