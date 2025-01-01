import mongoose, { type Model } from "mongoose";
import { getUserAccessRulesDbSchema } from "../../../../databases/provider/userAccessRules/dbSchema.js";
import type { UserAccessRule } from "@prosopo/types-database";

abstract class CommandBase {
	public abstract getName(): string;

	public abstract process(args: object): Promise<void>;

	protected async createModelByArgs(
		args: object,
	): Promise<Model<UserAccessRule>> {
		const db = "db" in args && "string" === typeof args.db ? args.db : "";

		if (!db) {
			throw new Error("DB argument is required");
		}

		return await this.createModel(db);
	}

	protected async createModel(db: string): Promise<Model<UserAccessRule>> {
		const mongoConnection = await mongoose.connect(`mongodb://${db}`);

		return mongoConnection.model(
			"UserAccessRules",
			getUserAccessRulesDbSchema(),
		);
	}
}

export { CommandBase };
