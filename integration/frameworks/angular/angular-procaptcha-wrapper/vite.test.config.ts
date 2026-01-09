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

import { ViteTestConfig } from "@prosopo/config";

export default function () {
	const config = ViteTestConfig("./tsconfig.json");
	config.test = config.test || {};
	config.test.environment = "jsdom";
	config.test.globals = true;

	// Ensure coverage is enabled with proper configuration
	config.test.coverage = config.test.coverage || {};
	config.test.coverage.enabled = true;
	config.test.coverage.reporter = ["text", "json", "html"];
	config.test.coverage.all = true;
	config.test.coverage.include = ["src/**/*.ts"];

	// Ensure type checking is enabled
	config.test.typecheck = config.test.typecheck || {};
	config.test.typecheck.enabled = true;

	return config;
}
