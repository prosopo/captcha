import type { Types } from "mongoose";
import type RuleRecord from "../ruleRecord";

interface MongooseRuleRecord extends RuleRecord {
	_id: Types.ObjectId;
}

export default MongooseRuleRecord;
