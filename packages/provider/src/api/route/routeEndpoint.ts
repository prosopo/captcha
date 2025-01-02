import type { ApiResponse } from "@prosopo/types";
import type { z, ZodType } from "zod";

interface RouteEndpoint<T extends ZodType | undefined> {
	handleRequest: T extends ZodType
		? (args: z.infer<T>) => Promise<ApiResponse>
		: () => Promise<ApiResponse>;

	getRequestArgsSchema(): T;
}

export type { RouteEndpoint };
