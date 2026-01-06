import { describe, expect, test } from "vitest";
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
import { anew } from "./asyncConstructor.js";

describe("asyncConstructor", () => {
	test("constructs async", async () => {
		class Abc {
			a: boolean;
			b: number;
			c: string;
			d: string;

			constructor(a: boolean, b: number, c: string, d: Promise<string>) {
				this.a = a;
				this.b = b;
				this.c = c;
				this.d = ""; // temp value for d
			}

			async ctor(a: boolean, b: number, c: string, d: Promise<string>) {
				this.d = await d; // await the promise to obtain value for `d`
			}
		}

		const abc = await anew(Abc, true, 1, "abc", Promise.resolve("def"));
		expect(abc.a).to.equal(true);
		expect(abc.b).to.equal(1);
		expect(abc.c).to.equal("abc");
		expect(abc.d).to.equal("def");
	});

	test("constructs async with no args", async () => {
		class Abc {
			async ctor() {}
		}

		const abc = await anew(Abc);
		expect(abc).toBeInstanceOf(Abc);
	});

	test("constructs async with constructor args but no ctor args", async () => {
		class Abc {
			value: number;

			constructor(value: number) {
				this.value = value;
			}

			async ctor() {}
		}

		const abc = await anew(Abc, 42);
		expect(abc).toBeInstanceOf(Abc);
		expect(abc.value).toBe(42);
	});

	test("handles async ctor that throws", async () => {
		class Abc {
			async ctor() {
				throw new Error("Async ctor error");
			}
		}

		await expect(anew(Abc)).rejects.toThrow("Async ctor error");
	});

	test("handles async ctor with same args as constructor", async () => {
		class Abc {
			a: number;
			b: string;

			constructor(a: number, b: Promise<string>) {
				this.a = a;
				this.b = "";
			}

			async ctor(a: number, b: Promise<string>) {
				this.b = await b;
			}
		}

		const abc = await anew(Abc, 1, Promise.resolve("test"));
		expect(abc.a).toBe(1);
		expect(abc.b).toBe("test");
	});
});
