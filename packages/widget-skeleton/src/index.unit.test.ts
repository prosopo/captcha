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
import * as index from "./index.js";
import { darkTheme, lightTheme } from "./theme.js";
import { createWidgetSkeleton } from "./webComponent/createWidget.js";

describe("index", () => {
	describe("exports", () => {
		it("should export createWidgetSkeleton", () => {
			expect(index.createWidgetSkeleton).toBeDefined();
			expect(index.createWidgetSkeleton).toBe(createWidgetSkeleton);
		});

		it("should export lightTheme", () => {
			expect(index.lightTheme).toBeDefined();
			expect(index.lightTheme).toBe(lightTheme);
		});

		it("should export darkTheme", () => {
			expect(index.darkTheme).toBeDefined();
			expect(index.darkTheme).toBe(darkTheme);
		});

		it("should export WIDGET_URL", () => {
			expect(index.WIDGET_URL).toBeDefined();
			expect(index.WIDGET_URL).toBe(WIDGET_URL);
		});

		it("should export WIDGET_URL_TEXT", () => {
			expect(index.WIDGET_URL_TEXT).toBeDefined();
			expect(index.WIDGET_URL_TEXT).toBe(WIDGET_URL_TEXT);
		});

		it("should export WIDGET_INNER_HEIGHT", () => {
			expect(index.WIDGET_INNER_HEIGHT).toBeDefined();
			expect(index.WIDGET_INNER_HEIGHT).toBe(WIDGET_INNER_HEIGHT);
		});

		it("should export WIDGET_OUTER_HEIGHT", () => {
			expect(index.WIDGET_OUTER_HEIGHT).toBeDefined();
			expect(index.WIDGET_OUTER_HEIGHT).toBe(WIDGET_OUTER_HEIGHT);
		});

		it("should export WIDGET_MIN_HEIGHT", () => {
			expect(index.WIDGET_MIN_HEIGHT).toBeDefined();
			expect(index.WIDGET_MIN_HEIGHT).toBe(WIDGET_MIN_HEIGHT);
		});

		it("should export WIDGET_MAX_WIDTH", () => {
			expect(index.WIDGET_MAX_WIDTH).toBeDefined();
			expect(index.WIDGET_MAX_WIDTH).toBe(WIDGET_MAX_WIDTH);
		});

		it("should export WIDGET_DIMENSIONS", () => {
			expect(index.WIDGET_DIMENSIONS).toBeDefined();
			expect(index.WIDGET_DIMENSIONS).toBe(WIDGET_DIMENSIONS);
		});

		it("should export WIDGET_BORDER_RADIUS", () => {
			expect(index.WIDGET_BORDER_RADIUS).toBeDefined();
			expect(index.WIDGET_BORDER_RADIUS).toBe(WIDGET_BORDER_RADIUS);
		});

		it("should export WIDGET_PADDING", () => {
			expect(index.WIDGET_PADDING).toBeDefined();
			expect(index.WIDGET_PADDING).toBe(WIDGET_PADDING);
		});

		it("should export WIDGET_BORDER", () => {
			expect(index.WIDGET_BORDER).toBeDefined();
			expect(index.WIDGET_BORDER).toBe(WIDGET_BORDER);
		});

		it("should export WIDGET_CHECKBOX_SPINNER_CSS_CLASS", () => {
			expect(index.WIDGET_CHECKBOX_SPINNER_CSS_CLASS).toBeDefined();
			expect(index.WIDGET_CHECKBOX_SPINNER_CSS_CLASS).toBe(
				WIDGET_CHECKBOX_SPINNER_CSS_CLASS,
			);
		});
	});
});
