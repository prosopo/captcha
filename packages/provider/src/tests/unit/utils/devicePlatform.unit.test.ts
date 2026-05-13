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
import { derivePlatform } from "../../../utils/devicePlatform.js";

const IPHONE_UA =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_UA =
	"Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const MAC_UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const PIXEL_UA =
	"Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";
const WINDOWS_CHROME_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";

describe("derivePlatform", () => {
	describe("isApple", () => {
		it("matches iPhone UA", () => {
			expect(derivePlatform(IPHONE_UA, false).isApple).toBe(true);
		});
		it("matches iPad UA", () => {
			expect(derivePlatform(IPAD_UA, false).isApple).toBe(true);
		});
		it("matches Macintosh UA", () => {
			expect(derivePlatform(MAC_UA, false).isApple).toBe(true);
		});
		it("does not match Android UA", () => {
			expect(derivePlatform(PIXEL_UA, false).isApple).toBe(false);
		});
		it("does not match Windows UA", () => {
			expect(derivePlatform(WINDOWS_CHROME_UA, false).isApple).toBe(false);
		});
		it("does not match empty UA", () => {
			expect(derivePlatform("", false).isApple).toBe(false);
		});
	});

	describe("isWebView", () => {
		it("passes through caller-supplied true", () => {
			expect(derivePlatform(WINDOWS_CHROME_UA, true).isWebView).toBe(true);
		});
		it("passes through caller-supplied false", () => {
			expect(derivePlatform(IPHONE_UA, false).isWebView).toBe(false);
		});
	});

	describe("isMobile", () => {
		it("prefers ipInfo.isMobile=true when provided", () => {
			expect(
				derivePlatform(WINDOWS_CHROME_UA, false, { isMobile: true }).isMobile,
			).toBe(true);
		});
		it("prefers ipInfo.isMobile=false when provided, even on a mobile UA", () => {
			expect(
				derivePlatform(IPHONE_UA, false, { isMobile: false }).isMobile,
			).toBe(false);
		});
		it("falls back to UA when ipInfo missing — iPhone is mobile", () => {
			expect(derivePlatform(IPHONE_UA, false).isMobile).toBe(true);
		});
		it("falls back to UA when ipInfo missing — Pixel is mobile", () => {
			expect(derivePlatform(PIXEL_UA, false).isMobile).toBe(true);
		});
		it("falls back to UA when ipInfo missing — Windows Chrome is not mobile", () => {
			expect(derivePlatform(WINDOWS_CHROME_UA, false).isMobile).toBe(false);
		});
		it("falls back to UA when ipInfo missing — Mac Safari is not mobile", () => {
			expect(derivePlatform(MAC_UA, false).isMobile).toBe(false);
		});
	});
});
