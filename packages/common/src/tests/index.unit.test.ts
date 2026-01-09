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

import { describe, expect, it } from "vitest";
import * as Common from "../index.js";

describe("index exports", () => {
	it("should export error classes", () => {
		expect(Common.ProsopoError).toBeDefined();
		expect(Common.ProsopoEnvError).toBeDefined();
		expect(Common.ProsopoContractError).toBeDefined();
		expect(Common.ProsopoTxQueueError).toBeDefined();
		expect(Common.ProsopoDBError).toBeDefined();
		expect(Common.ProsopoCliError).toBeDefined();
		expect(Common.ProsopoDatasetError).toBeDefined();
		expect(Common.ProsopoApiError).toBeDefined();
		expect(Common.ProsopoBaseError).toBeDefined();
	});

	it("should export error utilities", () => {
		expect(Common.unwrapError).toBeDefined();
		expect(Common.isZodError).toBeDefined();
		expect(typeof Common.unwrapError).toBe("function");
		expect(typeof Common.isZodError).toBe("function");
	});

	it("should export logger types and functions", () => {
		expect(Common.getLogger).toBeDefined();
		expect(Common.parseLogLevel).toBeDefined();
		expect(Common.NativeLogger).toBeDefined();
		expect(Common.stringifyBigInts).toBeDefined();
		expect(typeof Common.getLogger).toBe("function");
		expect(typeof Common.parseLogLevel).toBe("function");
		expect(typeof Common.stringifyBigInts).toBe("function");
	});

	it("should export logger constants", () => {
		expect(Common.InfoLevel).toBe("info");
		expect(Common.DebugLevel).toBe("debug");
		expect(Common.TraceLevel).toBe("trace");
		expect(Common.WarnLevel).toBe("warn");
		expect(Common.ErrorLevel).toBe("error");
		expect(Common.FatalLevel).toBe("fatal");
		expect(Common.FormatJson).toBe("json");
		expect(Common.FormatPlain).toBe("plain");
	});

	it("should export batch utilities", () => {
		expect(Common.chunkIntoBatches).toBeDefined();
		expect(Common.executeBatchesSequentially).toBeDefined();
		expect(Common.executeBatchesInParallel).toBeDefined();
		expect(typeof Common.chunkIntoBatches).toBe("function");
		expect(typeof Common.executeBatchesSequentially).toBe("function");
		expect(typeof Common.executeBatchesInParallel).toBe("function");
	});
});
