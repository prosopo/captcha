import type { IndexDefinition, IndexOptions } from "mongoose";

interface MongooseIndex {
	definition: IndexDefinition;
	options: IndexOptions;
}

export default MongooseIndex;
