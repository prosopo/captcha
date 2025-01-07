import { array, boolean, object, string } from "zod";
import zodIp from "../../../ip/zodIp.js";
import zodConfig from "../../../config/zodConfig.js";

const zodInsertManyRulesSchema = array(
	object({
		isUserBlocked: boolean(),
		clientId: string().optional(),
		description: string().optional(),
		userIp: zodIp.optional(),
		userId: string().optional(),
		config: zodConfig.optional(),
	}),
);

export default zodInsertManyRulesSchema;
