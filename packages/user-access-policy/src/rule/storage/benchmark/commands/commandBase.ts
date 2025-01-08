import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import type rulesStorageFactory from "../storageFactory/rulesStorageFactory.js";
import type RulesStorage from "../../rulesStorage.js";

abstract class CommandBase implements CommandModule {
	abstract command: string;
	abstract describe: string;

	public constructor(private readonly storageFactory: rulesStorageFactory) {}

	public builder(yargs: Argv): Argv {
		return yargs.option("dbUrl", {
			type: "string" as const,
			describe: "like 'localhost:27017'",
			demandOption: true,
		});
	}

	abstract handler(args: ArgumentsCamelCase): Promise<void>;

	protected async createRulesStorage(
		args: ArgumentsCamelCase,
	): Promise<RulesStorage> {
		const dbUrl = "string" === typeof args.dbUrl ? args.dbUrl : "";

		if ("" === dbUrl) {
			throw new Error("dbUrl is not set");
		}

		return await this.storageFactory.createRulesStorage(dbUrl);
	}
}

export default CommandBase;
