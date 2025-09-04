// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { type RedisClientType, createClient } from "redis";

export const createTestRedisClient = async (): Promise<RedisClientType> =>
	(await createClient({
		// /docker/redis/redis-stack.docker-compose.yml
		url: "redis://localhost:6379",
		password: "root",
	})
		.on("error", (err) => console.log("Redis Client Error", err))
		.connect()) as RedisClientType;
