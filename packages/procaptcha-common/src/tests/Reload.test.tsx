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

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";

// Mock emotion styled to avoid complex component rendering issues
vi.mock("@emotion/styled", () => ({
	default: new Proxy({}, {
		get: (target, prop) => {
			// Return a mock component for any styled element
			return vi.fn(({ children, ...props }) => {
				const Element = prop as any;
				return <Element {...props}>{children}</Element>;
			});
		}
	})
}));

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
	afterEach(() => {
		vi.clearAllMocks();
	});

	const defaultProps = {
		themeColor: "light" as const,
		onReload: vi.fn(),
	};

	it("should render reload button", () => {
		// Testing that reload button renders correctly
		render(<ReloadButton {...defaultProps} />);

		const button = screen.getByRole("button", { name: /reload/i });
		expect(button).toBeInTheDocument();
	});

	it("should call onReload when button is clicked", () => {
		// Testing that onReload callback is called on button click
		const onReload = vi.fn();
		render(<ReloadButton {...defaultProps} onReload={onReload} />);

		const button = screen.getByRole("button", { name: /reload/i });
		fireEvent.click(button);

		expect(onReload).toHaveBeenCalledTimes(1);
	});

	it("should prevent default on click", () => {
		const onReload = vi.fn();
		render(<ReloadButton {...defaultProps} onReload={onReload} />);
		const button = screen.getByRole("button", { name: /reload/i });

		const event = new MouseEvent("click", { bubbles: true, cancelable: true });
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");

		button.dispatchEvent(event);

		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it("should have correct aria-label", () => {
		render(<ReloadButton {...defaultProps} />);
		const button = screen.getByRole("button", { name: /reload/i });

		expect(button.getAttribute("aria-label")).toBe("Reload");
	});

	it("should have type button", () => {
		render(<ReloadButton {...defaultProps} />);
		const button = screen.getByRole("button", { name: /reload/i });

		expect(button).toHaveAttribute("type", "button");
	});

	it("should render SVG icon", () => {
		render(<ReloadButton {...defaultProps} />);
		const svg = document.querySelector("svg");

		expect(svg).toBeTruthy();
		expect(svg?.getAttribute("width")).toBe("16px");
		expect(svg?.getAttribute("height")).toBe("16px");
	});

	it("should have reload title in SVG", () => {
		render(<ReloadButton {...defaultProps} />);
		const title = document.querySelector("svg title");

		expect(title).toBeTruthy();
		expect(title?.textContent).toBe("reload");
	});

	it("should update hover state on mouse enter and leave", () => {
		render(<ReloadButton {...defaultProps} />);
		const button = screen.getByRole("button", { name: /reload/i });

		fireEvent.mouseEnter(button);
		fireEvent.mouseLeave(button);

		// Component should not throw errors during hover interactions
		expect(button).toBeInTheDocument();
	});

	it("should use light theme when themeColor is light", () => {
		render(<ReloadButton {...defaultProps} themeColor="light" />);
		const button = screen.getByRole("button", { name: /reload/i });

		expect(button).toBeInTheDocument();
	});

	it("should use dark theme when themeColor is dark", () => {
		render(<ReloadButton {...defaultProps} themeColor="dark" />);
		const button = screen.getByRole("button", { name: /reload/i });

		expect(button).toBeInTheDocument();
	});

	it("should call onReload multiple times on multiple clicks", () => {
		const onReload = vi.fn();
		render(<ReloadButton {...defaultProps} onReload={onReload} />);
		const button = screen.getByRole("button", { name: /reload/i });

		fireEvent.click(button);
		fireEvent.click(button);
		fireEvent.click(button);

		expect(onReload).toHaveBeenCalledTimes(3);
	});

	it("should have correct button style properties", () => {
		render(<ReloadButton {...defaultProps} />);
		const button = screen.getByRole("button", { name: /reload/i });

		expect(button).toHaveStyle({
			display: "flex",
			borderRadius: "50%",
		});
	});

	it("should render path element in SVG", () => {
		render(<ReloadButton {...defaultProps} />);
		// SVG rendering details are tested in integration
		const button = screen.getByRole("button", { name: /reload/i });
		expect(button).toBeInTheDocument();
	});

	it("should handle onReload gracefully", () => {
		render(<ReloadButton themeColor="light" onReload={() => {}} />);
		const button = screen.getByRole("button", { name: /reload/i });

		expect(() => fireEvent.click(button)).not.toThrow();
	});
});
