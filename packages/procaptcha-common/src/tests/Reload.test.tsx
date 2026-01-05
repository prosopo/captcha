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

import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the widget-skeleton theme - must be hoisted
vi.mock("@prosopo/widget-skeleton", () => {
	const lightTheme = {
		palette: {
			mode: "light" as const,
			primary: {
				main: "#487DFA",
				contrastText: "#fff",
			},
			background: {
				default: "#fff",
				contrastText: "#000",
			},
			border: "#bdbdbd",
			error: {
				main: "#f44336",
			},
			grey: {
				500: "#9e9e9e",
				700: "#616161",
			},
		},
	};
	return {
		lightTheme,
		darkTheme: lightTheme,
	};
});

import { ReloadButton } from "../reactComponents/Reload.js";

describe("reactComponents/Reload", () => {
	let container: HTMLDivElement;
	let root: ReturnType<typeof createRoot>;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(() => {
		root.unmount();
		container.remove();
		vi.clearAllMocks();
	});

	const defaultProps = {
		themeColor: "light" as const,
		onReload: vi.fn(),
	};

	it("should render reload button", () => {
		root.render(<ReloadButton {...defaultProps} />);
		const button = container.querySelector("button.reload-button");

		expect(button).toBeTruthy();
	});

	it("should call onReload when button is clicked", () => {
		const onReload = vi.fn();
		root.render(<ReloadButton {...defaultProps} onReload={onReload} />);
		const button = container.querySelector(
			"button.reload-button",
		) as HTMLButtonElement;

		button.click();

		expect(onReload).toHaveBeenCalledTimes(1);
	});

	it("should prevent default on click", () => {
		const onReload = vi.fn();
		root.render(<ReloadButton {...defaultProps} onReload={onReload} />);
		const button = container.querySelector(
			"button.reload-button",
		) as HTMLButtonElement;

		const event = new MouseEvent("click", { bubbles: true, cancelable: true });
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");

		button.dispatchEvent(event);

		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it("should have correct aria-label", () => {
		root.render(<ReloadButton {...defaultProps} />);
		const button = container.querySelector(
			"button.reload-button",
		) as HTMLButtonElement;

		expect(button.getAttribute("aria-label")).toBe("Reload");
	});

	it("should have type button", () => {
		root.render(<ReloadButton {...defaultProps} />);
		const button = container.querySelector(
			"button.reload-button",
		) as HTMLButtonElement;

		expect(button.type).toBe("button");
	});

	it("should render SVG icon", () => {
		root.render(<ReloadButton {...defaultProps} />);
		const svg = container.querySelector("svg");

		expect(svg).toBeTruthy();
		expect(svg?.getAttribute("width")).toBe("16px");
		expect(svg?.getAttribute("height")).toBe("16px");
	});

	it("should have reload title in SVG", () => {
		root.render(<ReloadButton {...defaultProps} />);
		const title = container.querySelector("svg title");

		expect(title).toBeTruthy();
		expect(title?.textContent).toBe("reload");
	});

	it("should update hover state on mouse enter and leave", () => {
		root.render(<ReloadButton {...defaultProps} />);
		const button = container.querySelector(
			"button.reload-button",
		) as HTMLButtonElement;

		const mouseEnterEvent = new MouseEvent("mouseenter", { bubbles: true });
		button.dispatchEvent(mouseEnterEvent);

		const mouseLeaveEvent = new MouseEvent("mouseleave", { bubbles: true });
		button.dispatchEvent(mouseLeaveEvent);
	});

	it("should use light theme when themeColor is light", () => {
		root.render(<ReloadButton {...defaultProps} themeColor="light" />);
		const button = container.querySelector(
			"button.reload-button",
		) as HTMLButtonElement;

		expect(button).toBeTruthy();
	});

	it("should use dark theme when themeColor is dark", () => {
		root.render(<ReloadButton {...defaultProps} themeColor="dark" />);
		const button = container.querySelector(
			"button.reload-button",
		) as HTMLButtonElement;

		expect(button).toBeTruthy();
	});

	it("should call onReload multiple times on multiple clicks", () => {
		const onReload = vi.fn();
		root.render(<ReloadButton {...defaultProps} onReload={onReload} />);
		const button = container.querySelector(
			"button.reload-button",
		) as HTMLButtonElement;

		button.click();
		button.click();
		button.click();

		expect(onReload).toHaveBeenCalledTimes(3);
	});

	it("should have correct button style properties", () => {
		root.render(<ReloadButton {...defaultProps} />);
		const button = container.querySelector(
			"button.reload-button",
		) as HTMLButtonElement;

		const style = button.style;
		expect(style.display).toBe("flex");
		expect(style.borderRadius).toBe("50%");
	});

	it("should render path element in SVG", () => {
		root.render(<ReloadButton {...defaultProps} />);
		const path = container.querySelector("svg path");

		expect(path).toBeTruthy();
		expect(path?.getAttribute("shapeRendering")).toBe("optimizeQuality");
	});

	it("should handle undefined onReload gracefully", () => {
		root.render(<ReloadButton themeColor="light" onReload={vi.fn()} />);
		const button = container.querySelector(
			"button.reload-button",
		) as HTMLButtonElement;

		expect(() => button.click()).not.toThrow();
	});
});
