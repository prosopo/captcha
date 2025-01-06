import type { Types } from "mongoose";
import type Rule from "../rule.js";

interface MongooseRuleRecord extends Rule {
	_id: Types.ObjectId;
}

export default MongooseRuleRecord;
