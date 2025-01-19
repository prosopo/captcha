import { describe, expect, it } from "vitest";
import { computeFrictionlessScore } from "../../../../tasks/frictionless/frictionlessTasksUtils.js";

describe("Frictionless Task Utils", () => {
	describe("computeFrictionlessScore", () => {
		it("should return the minimum of 1 and the sum of all score components", async () => {
			const scoreComponents = {
				a: 0.2,
				b: 0.3,
				c: 0.4,
				d: 0.1,
			};
			const result = computeFrictionlessScore(scoreComponents);
			expect(result).toBe(1);
		});
		it("should return the minimum of 1 and the sum of all score components", async () => {
			const scoreComponents = {
				a: 0.1,
				b: 0.1,
				c: 0.1,
				d: 0.1,
			};
			const result = computeFrictionlessScore(scoreComponents);
			expect(result).toBe(0.4);
		});
		it("should return 1 if the sum of all score components is greater than 1", async () => {
			const scoreComponents = {
				a: 1,
				b: 0.3,
				c: 0.4,
				d: 0.2,
			};
			const result = computeFrictionlessScore(scoreComponents);
			expect(result).toBe(1);
		});
	});
});
