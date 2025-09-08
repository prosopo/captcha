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

export {
	type RedisConnection,
	connectToRedis,
	setupRedisIndex,
} from "./redisClient.js";
export type { RedisIndex } from "./redisIndex.js";
export { createTestRedisConnection } from "./tests/testRedisConnection.js";

// re-export, so all the others depend on this package instead of having multiple Redis dependencies
// Important! Do not use wildcard exports ("export * from x") for external dependencies:
// for some reason it makes the incomplete Vite builds

export type { RedisClientType } from "redis";
export {
	SCHEMA_FIELD_TYPE,
	type FtSearchOptions,
	type SearchReply,
} from "@redis/search";
export type { SearchNoContentReply } from "@redis/search/dist/lib/commands/SEARCH_NOCONTENT.js";
