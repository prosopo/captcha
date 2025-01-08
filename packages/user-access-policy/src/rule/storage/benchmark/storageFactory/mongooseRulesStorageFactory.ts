import mongoose, { type Model } from "mongoose";
import type Rule from "../../../rule.js";
import type RulesStorageFactory from "./rulesStorageFactory.js";
import type RulesStorage from "../../rulesStorage.js";
import getMongooseRuleRecordSchema from "../../record/getMongooseRuleRecordSchema.js";
import MongooseRulesStorage from "../../mongooseRulesStorage.js";

class MongooseRulesStorageFactory implements RulesStorageFactory {
	async createRulesStorage(dbUrl: string): Promise<RulesStorage> {
		const model = await this.createModel(dbUrl);

		return new MongooseRulesStorage(model);
	}

	protected async createModel(db: string): Promise<Model<Rule>> {
		const mongoConnection = await mongoose.connect(`mongodb://${db}`);

		return mongoConnection.model(
			"UserAccessPolicyRules",
			getMongooseRuleRecordSchema(),
		);
	}
}


export default MongooseRulesStorageFactory;
