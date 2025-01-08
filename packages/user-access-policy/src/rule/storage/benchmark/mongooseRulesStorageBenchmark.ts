import RulesStorageBenchmark from "./rulesStorageBenchmark.js";
import MongooseRulesStorageFactory from "./storageFactory/mongooseRulesStorageFactory.js";
import MongooseConnectionCleaner from "./connectionCleaner/mongooseConnectionCleaner.js";

const rulesStorageFactory = new MongooseRulesStorageFactory();
const connectionCleaner = new MongooseConnectionCleaner();

const benchmark = new RulesStorageBenchmark(
	rulesStorageFactory,
	connectionCleaner,
);

await benchmark.processInput();
