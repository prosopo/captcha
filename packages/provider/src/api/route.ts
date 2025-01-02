import type {ZodType} from "zod";
import type {Endpoint} from "../endpoint.js";

interface Route {
	path: string;
	endpoint: Endpoint<ZodType | undefined>;
}

export type { Route };
