import { array, object, string } from "zod";
import zodIp from "../../../ip/schema/zodIp.js";

const zodDeleteManyRulesSchema = array(
	object({
		clientId: string().optional(),
		userIp: zodIp.optional(),
		userId: string().optional(),
	}),
);

export default zodDeleteManyRulesSchema;
