import { assert, describe, test } from "vitest";

describe("dummy", () => {
	test("dummy", async () => {
		assert(true, "This is a dummy test to ensure vite doesn't complain about no tests found.");
	}, 120000);
});
