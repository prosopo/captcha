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
import {
	WIDGET_BORDER,
	WIDGET_BORDER_RADIUS,
	WIDGET_CHECKBOX_SPINNER_CSS_CLASS,
	WIDGET_DIMENSIONS,
	WIDGET_INNER_HEIGHT,
	WIDGET_MAX_WIDTH,
	WIDGET_MIN_HEIGHT,
	WIDGET_OUTER_HEIGHT,
	WIDGET_PADDING,
	WIDGET_URL,
	WIDGET_URL_TEXT,
} from "./constants.js";

describe("constants", () => {
	describe("WIDGET_URL", () => {
		it("should be defined", () => {
			expect(WIDGET_URL).toBeDefined();
		});

		it("should be a string", () => {
			expect(typeof WIDGET_URL).toBe("string");
		});

		it("should be a valid URL", () => {
			expect(WIDGET_URL).toBe("https://prosopo.io");
		});
	});

	describe("WIDGET_URL_TEXT", () => {
		it("should be defined", () => {
			expect(WIDGET_URL_TEXT).toBeDefined();
		});

		it("should be a string", () => {
			expect(typeof WIDGET_URL_TEXT).toBe("string");
		});

		it("should contain descriptive text", () => {
			expect(WIDGET_URL_TEXT).toContain("prosopo.io");
		});
	});

	describe("WIDGET_INNER_HEIGHT", () => {
		it("should be defined", () => {
			expect(WIDGET_INNER_HEIGHT).toBeDefined();
		});

		it("should be a number", () => {
			expect(typeof WIDGET_INNER_HEIGHT).toBe("number");
		});

		it("should have correct value", () => {
			expect(WIDGET_INNER_HEIGHT).toBe(74);
		});
	});

	describe("WIDGET_OUTER_HEIGHT", () => {
		it("should be defined", () => {
			expect(WIDGET_OUTER_HEIGHT).toBeDefined();
		});

		it("should be a number", () => {
			expect(typeof WIDGET_OUTER_HEIGHT).toBe("number");
		});

		it("should have correct value", () => {
			expect(WIDGET_OUTER_HEIGHT).toBe(80);
		});

		it("should be greater than inner height", () => {
			expect(WIDGET_OUTER_HEIGHT).toBeGreaterThan(WIDGET_INNER_HEIGHT);
		});
	});

	describe("WIDGET_MIN_HEIGHT", () => {
		it("should be defined", () => {
			expect(WIDGET_MIN_HEIGHT).toBeDefined();
		});

		it("should be a string", () => {
			expect(typeof WIDGET_MIN_HEIGHT).toBe("string");
		});

		it("should include px unit", () => {
			expect(WIDGET_MIN_HEIGHT).toContain("px");
		});

		it("should match outer height", () => {
			expect(WIDGET_MIN_HEIGHT).toBe("80px");
		});
	});

	describe("WIDGET_MAX_WIDTH", () => {
		it("should be defined", () => {
			expect(WIDGET_MAX_WIDTH).toBeDefined();
		});

		it("should be a string", () => {
			expect(typeof WIDGET_MAX_WIDTH).toBe("string");
		});

		it("should include px unit", () => {
			expect(WIDGET_MAX_WIDTH).toContain("px");
		});

		it("should have correct value", () => {
			expect(WIDGET_MAX_WIDTH).toBe("302px");
		});
	});

	describe("WIDGET_DIMENSIONS", () => {
		it("should be defined", () => {
			expect(WIDGET_DIMENSIONS).toBeDefined();
		});

		it("should be an object", () => {
			expect(typeof WIDGET_DIMENSIONS).toBe("object");
		});

		it("should have maxWidth property", () => {
			expect(WIDGET_DIMENSIONS).toHaveProperty("maxWidth");
			expect(WIDGET_DIMENSIONS.maxWidth).toBe(WIDGET_MAX_WIDTH);
		});

		it("should have minHeight property", () => {
			expect(WIDGET_DIMENSIONS).toHaveProperty("minHeight");
			expect(WIDGET_DIMENSIONS.minHeight).toBe(`${WIDGET_OUTER_HEIGHT}px`);
		});
	});

	describe("WIDGET_BORDER_RADIUS", () => {
		it("should be defined", () => {
			expect(WIDGET_BORDER_RADIUS).toBeDefined();
		});

		it("should be a string", () => {
			expect(typeof WIDGET_BORDER_RADIUS).toBe("string");
		});

		it("should include px unit", () => {
			expect(WIDGET_BORDER_RADIUS).toContain("px");
		});

		it("should have correct value", () => {
			expect(WIDGET_BORDER_RADIUS).toBe("8px");
		});
	});

	describe("WIDGET_PADDING", () => {
		it("should be defined", () => {
			expect(WIDGET_PADDING).toBeDefined();
		});

		it("should be a string", () => {
			expect(typeof WIDGET_PADDING).toBe("string");
		});

		it("should include px unit", () => {
			expect(WIDGET_PADDING).toContain("px");
		});

		it("should have correct value", () => {
			expect(WIDGET_PADDING).toBe("2px");
		});
	});

	describe("WIDGET_BORDER", () => {
		it("should be defined", () => {
			expect(WIDGET_BORDER).toBeDefined();
		});

		it("should be a string", () => {
			expect(typeof WIDGET_BORDER).toBe("string");
		});

		it("should have correct value", () => {
			expect(WIDGET_BORDER).toBe("1px solid");
		});
	});

	describe("WIDGET_CHECKBOX_SPINNER_CSS_CLASS", () => {
		it("should be defined", () => {
			expect(WIDGET_CHECKBOX_SPINNER_CSS_CLASS).toBeDefined();
		});

		it("should be a string", () => {
			expect(typeof WIDGET_CHECKBOX_SPINNER_CSS_CLASS).toBe("string");
		});

		it("should be a valid CSS class name", () => {
			expect(WIDGET_CHECKBOX_SPINNER_CSS_CLASS).toBe(
				"checkbox__loading-spinner",
			);
		});
	});
});
