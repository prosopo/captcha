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

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoKeyBanner } from "../reactComponents/DemoKeyBanner.js";

describe("DemoKeyBanner", () => {
	it("should render with always_pass behavior", () => {
		render(<DemoKeyBanner behavior="always_pass" />);
		const banner = screen.getByTestId("demo-key-banner");
		expect(banner).toBeDefined();
		expect(banner.textContent).toContain("ALWAYS PASS");
		expect(banner.textContent).toContain("DEMO MODE");
	});

	it("should render with always_fail behavior", () => {
		render(<DemoKeyBanner behavior="always_fail" />);
		const banner = screen.getByTestId("demo-key-banner");
		expect(banner).toBeDefined();
		expect(banner.textContent).toContain("ALWAYS FAIL");
		expect(banner.textContent).toContain("DEMO MODE");
	});

	it("should contain a link to docs", () => {
		render(<DemoKeyBanner behavior="always_pass" />);
		const link = screen.getByRole("link", { name: /learn more/i });
		expect(link).toBeDefined();
		expect(link.getAttribute("href")).toContain("demo-keys");
	});

	it("should have proper accessibility attributes", () => {
		render(<DemoKeyBanner behavior="always_pass" />);
		const link = screen.getByRole("link", { name: /learn more/i });
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	});
});
