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

import type { Logger } from "@prosopo/common";
import { vi } from "vitest";

const loggerMockedInstance: Logger = {
	trace: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	fatal: vi.fn(),
	log: vi.fn(),
	setLogLevel: vi.fn(),
	getLogLevel: vi.fn(),
	with: vi.fn().mockReturnThis(),
	getScope: vi.fn().mockReturnValue("test-scope"),
	getUrl: vi.fn().mockReturnValue("test-url"),
	subScope: vi.fn().mockReturnThis(),
	getPretty: vi.fn().mockReturnValue(false),
	setPretty: vi.fn(),
	getPrintStack: vi.fn().mockReturnValue(false),
	setPrintStack: vi.fn(),
	getFormat: vi.fn().mockReturnValue("json"),
	setFormat: vi.fn(),
};

export { loggerMockedInstance };
