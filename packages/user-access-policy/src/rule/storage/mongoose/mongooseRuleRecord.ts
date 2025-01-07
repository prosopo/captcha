import type { Rule } from "@prosopo/types";
import type { Types } from "mongoose";

interface MongooseRuleRecord extends Rule {
	_id: Types.ObjectId;
}

export default MongooseRuleRecord;
