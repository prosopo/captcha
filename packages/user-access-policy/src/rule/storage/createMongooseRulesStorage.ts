import type RulesStorage from "./rulesStorage.js";
import MongooseRulesStorage from "./mongooseRulesStorage.js";
import type { Model } from "mongoose";
import type Rule from "../rule.js";

export default function (
	readingModel: Model<Rule> | null,
	writingModel: Model<Rule> | null = null,
): RulesStorage {
	return new MongooseRulesStorage(readingModel, writingModel);
}
