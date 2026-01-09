// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { MongoClient, Db, Collection } from "mongodb";
import { createClient, RedisClientType } from "redis";
import type { User } from "./index.js";

export interface DatabaseConnection {
	mongoClient: MongoClient;
	mongoDb: Db;
	redisClient: RedisClientType;
	usersCollection: Collection<User>;
}

export class DatabaseService {
	private mongoClient?: MongoClient;
	private redisClient?: RedisClientType;
	private db?: Db;
	private usersCollection?: Collection<User>;

	async connect(mongoUrl: string, redisUrl: string): Promise<DatabaseConnection> {
		// Connect to MongoDB
		this.mongoClient = new MongoClient(mongoUrl);
		await this.mongoClient.connect();
		this.db = this.mongoClient.db("testpkg2");

		// Create collections
		this.usersCollection = this.db.collection<User>("users");

		// Create indexes
		await this.usersCollection.createIndex({ email: 1 }, { unique: true });
		await this.usersCollection.createIndex({ name: 1 });

		// Connect to Redis
		this.redisClient = createClient({ url: redisUrl });
		await this.redisClient.connect();

		return {
			mongoClient: this.mongoClient,
			mongoDb: this.db,
			redisClient: this.redisClient,
			usersCollection: this.usersCollection,
		};
	}

	async createUser(user: User): Promise<void> {
		if (!this.usersCollection) {
			throw new Error("Database not connected");
		}

		await this.usersCollection.insertOne(user);

		// Cache user in Redis
		if (this.redisClient) {
			await this.redisClient.set(`user:${user.id}`, JSON.stringify(user), {
				EX: 3600, // 1 hour
			});
		}
	}

	async getUserById(id: string): Promise<User | null> {
		if (!this.usersCollection || !this.redisClient) {
			throw new Error("Database not connected");
		}

		// Try cache first
		const cached = await this.redisClient.get(`user:${id}`);
		if (cached) {
			return JSON.parse(cached);
		}

		// Query database
		const user = await this.usersCollection.findOne({ id });

		// Cache result
		if (user) {
			await this.redisClient.set(`user:${user.id}`, JSON.stringify(user), {
				EX: 3600,
			});
		}

		return user;
	}

	async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
		if (!this.usersCollection || !this.redisClient) {
			throw new Error("Database not connected");
		}

		const result = await this.usersCollection.findOneAndUpdate(
			{ id },
			{ $set: updates },
			{ returnDocument: "after" }
		);

		if (result) {
			// Update cache
			await this.redisClient.set(`user:${result.id}`, JSON.stringify(result), {
				EX: 3600,
			});
		}

		return result;
	}

	async deleteUser(id: string): Promise<boolean> {
		if (!this.usersCollection || !this.redisClient) {
			throw new Error("Database not connected");
		}

		const result = await this.usersCollection.deleteOne({ id });

		// Remove from cache
		await this.redisClient.del(`user:${id}`);

		return result.deletedCount > 0;
	}

	async getAllUsers(): Promise<User[]> {
		if (!this.usersCollection) {
			throw new Error("Database not connected");
		}

		const users = await this.usersCollection.find({}).toArray();
		return users;
	}

	async getUserCount(): Promise<number> {
		if (!this.usersCollection) {
			throw new Error("Database not connected");
		}

		return await this.usersCollection.countDocuments();
	}

	async searchUsersByName(name: string): Promise<User[]> {
		if (!this.usersCollection) {
			throw new Error("Database not connected");
		}

		return await this.usersCollection.find({
			name: { $regex: name, $options: "i" }
		}).toArray();
	}

	async close(): Promise<void> {
		if (this.redisClient) {
			await this.redisClient.quit();
		}
		if (this.mongoClient) {
			await this.mongoClient.close();
		}
	}
}