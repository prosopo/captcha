import type ConnectionCleaner from "./connectionCleaner.js";
import mongoose from "mongoose";

class MongooseConnectionCleaner implements ConnectionCleaner {
	public async cleanConnection(): Promise<void> {
		await mongoose.disconnect();
	}
}

export default MongooseConnectionCleaner;
