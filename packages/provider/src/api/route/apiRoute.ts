import type {ZodType} from "zod";
import type {ApiEndpoint} from "../apiEndpoint/apiEndpoint.js";

interface ApiRoute {
	path: string;
	endpoint: ApiEndpoint<ZodType | undefined>;
}

export type { ApiRoute };
