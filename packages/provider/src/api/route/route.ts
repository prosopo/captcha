import type { ZodType } from "zod";
import type { RouteEndpoint } from "./routeEndpoint.js";

interface Route {
	path: string;
	endpoint: RouteEndpoint<ZodType | undefined>;
}

export type { Route };
