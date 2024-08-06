// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import * as path from "node:path";
import { loadEnv } from "@prosopo/cli";
import { ViteBackendConfig } from "@prosopo/config";
import { defineConfig } from "vite";
import { version } from "./package.json";

// load env using our util because vite loadEnv is not working for .env.development
loadEnv();

// Package specific config
const packageName = "@prosopo/client-example-server";
const packageVersion = version;
const bundleName = "prosopo_client_example_server";
const dir = path.resolve();
const entry = "./src/app.ts";

process.env.TS_NODE_PROJECT = path.resolve("./tsconfig.json");

// Merge with generic backend config
export default defineConfig(async ({ command, mode }) => {
	const backendConfig = await ViteBackendConfig(
		packageName,
		packageVersion,
		bundleName,
		dir,
		entry,
		command,
		mode,
	);
	return defineConfig({
		...backendConfig,
		server: { port: process.env.PROSOPO_SERVER_PORT },
	});
});
