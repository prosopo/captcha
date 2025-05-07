import { type RedisClientType, createClient } from "redis";

export const createTestRedisClient = async (): Promise<RedisClientType> =>
	(await createClient({
		// /docker/redis/redis-stack.docker-compose.yml
		url: "redis://localhost:6379",
		password: "root",
	})
		.on("error", (err) => console.log("Redis Client Error", err))
		.connect()) as RedisClientType;
