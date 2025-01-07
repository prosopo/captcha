import type Rule from "../../rule.js";
import type { Types } from "mongoose";

interface MongooseRuleRecord extends Rule {
	_id: Types.ObjectId;
}

export default MongooseRuleRecord;
