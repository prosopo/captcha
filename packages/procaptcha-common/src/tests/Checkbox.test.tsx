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
		WIDGET_CHECKBOX_SPINNER_CSS_CLASS: "widget-checkbox-spinner",
	};
});

import { lightTheme } from "@prosopo/widget-skeleton";
import { Checkbox } from "../reactComponents/Checkbox.js";

describe("reactComponents/Checkbox", () => {
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
		theme: lightTheme,
		checked: false,
		onChange: vi.fn().mockResolvedValue(undefined),
		labelText: "Test Label",
		loading: false,
	};

	it("should render checkbox with label text", () => {
		root.render(<Checkbox {...defaultProps} />);
		const input = container.querySelector('input[type="checkbox"]');
		const label = container.querySelector("label");

		expect(input).toBeTruthy();
		expect(label).toBeTruthy();
		expect(label?.textContent).toBe("Test Label");
	});

	it("should render loading spinner when loading is true", () => {
		root.render(<Checkbox {...defaultProps} loading />);
		const spinner = container.querySelector(".widget-checkbox-spinner");
		const input = container.querySelector('input[type="checkbox"]');

		expect(spinner).toBeTruthy();
		expect(input).toBeFalsy();
	});

	it("should render checkbox when loading is false", () => {
		root.render(<Checkbox {...defaultProps} loading={false} />);
		const spinner = container.querySelector(".widget-checkbox-spinner");
		const input = container.querySelector('input[type="checkbox"]');

		expect(spinner).toBeFalsy();
		expect(input).toBeTruthy();
	});

	it("should call onChange when checkbox is clicked", async () => {
		const onChange = vi.fn().mockResolvedValue(undefined);
		root.render(<Checkbox {...defaultProps} onChange={onChange} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		const event = new Event("change", { bubbles: true });
		Object.defineProperty(event, "isTrusted", { value: true });
		input.dispatchEvent(event);

		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("should not call onChange when event is not trusted", () => {
		const onChange = vi.fn();
		root.render(<Checkbox {...defaultProps} onChange={onChange} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		const event = new Event("change", { bubbles: true });
		Object.defineProperty(event, "isTrusted", { value: false });
		input.dispatchEvent(event);

		expect(onChange).not.toHaveBeenCalled();
	});

	it("should call onChange on Enter key press", async () => {
		const onChange = vi.fn().mockResolvedValue(undefined);
		root.render(<Checkbox {...defaultProps} onChange={onChange} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		const event = new KeyboardEvent("keydown", {
			bubbles: true,
			key: "Enter",
		});
		Object.defineProperty(event, "isTrusted", { value: true });
		input.dispatchEvent(event);

		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("should not call onChange on non-Enter key press", () => {
		const onChange = vi.fn();
		root.render(<Checkbox {...defaultProps} onChange={onChange} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		const event = new KeyboardEvent("keydown", {
			bubbles: true,
			key: "Space",
		});
		Object.defineProperty(event, "isTrusted", { value: true });
		input.dispatchEvent(event);

		expect(onChange).not.toHaveBeenCalled();
	});

	it("should set checked state correctly", () => {
		root.render(<Checkbox {...defaultProps} checked={true} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		expect(input.checked).toBe(true);
	});

	it("should set unchecked state correctly", () => {
		root.render(<Checkbox {...defaultProps} checked={false} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		expect(input.checked).toBe(false);
	});

	it("should disable checkbox when error is provided", () => {
		root.render(<Checkbox {...defaultProps} error="Test error" />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		expect(input.disabled).toBe(true);
	});

	it("should enable checkbox when error is not provided", () => {
		root.render(<Checkbox {...defaultProps} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		expect(input.disabled).toBe(false);
	});

	it("should render error message with link when error is provided", () => {
		root.render(<Checkbox {...defaultProps} error="Test error" />);
		const errorLink = container.querySelector("label a");

		expect(errorLink).toBeTruthy();
		expect(errorLink?.textContent).toBe("Test error");
		expect(errorLink?.getAttribute("href")).toContain("docs.prosopo.io");
	});

	it("should render normal label when error is not provided", () => {
		root.render(<Checkbox {...defaultProps} />);
		const errorLink = container.querySelector("label a");
		const label = container.querySelector("label");

		expect(errorLink).toBeFalsy();
		expect(label).toBeTruthy();
		expect(label?.textContent).toBe("Test Label");
	});

	it("should have correct aria-label", () => {
		root.render(<Checkbox {...defaultProps} labelText="Accessible Label" />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		expect(input.getAttribute("aria-label")).toBe("Accessible Label");
	});

	it("should have correct aria-live attribute", () => {
		root.render(<Checkbox {...defaultProps} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		expect(input.getAttribute("aria-live")).toBe("assertive");
	});

	it("should have data-cy attribute for testing", () => {
		root.render(<Checkbox {...defaultProps} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		expect(input.getAttribute("data-cy")).toBe("captcha-checkbox");
	});

	it("should generate unique id for each instance", () => {
		const container1 = document.createElement("div");
		const container2 = document.createElement("div");
		document.body.appendChild(container1);
		document.body.appendChild(container2);
		const root1 = createRoot(container1);
		const root2 = createRoot(container2);

		root1.render(<Checkbox {...defaultProps} />);
		root2.render(<Checkbox {...defaultProps} />);

		const input1 = container1.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;
		const input2 = container2.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		expect(input1.id).toBeTruthy();
		expect(input2.id).toBeTruthy();
		expect(input1.id).not.toBe(input2.id);

		root1.unmount();
		root2.unmount();
		container1.remove();
		container2.remove();
	});

	it("should link label to checkbox via htmlFor", () => {
		root.render(<Checkbox {...defaultProps} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;
		const label = container.querySelector("label");

		expect(input.id).toBeTruthy();
		expect(label?.getAttribute("htmlFor") || label?.getAttribute("for")).toBe(
			input.id,
		);
	});

	it("should update hover state on mouse enter and leave", () => {
		root.render(<Checkbox {...defaultProps} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		const mouseEnterEvent = new MouseEvent("mouseenter", { bubbles: true });
		input.dispatchEvent(mouseEnterEvent);

		const mouseLeaveEvent = new MouseEvent("mouseleave", { bubbles: true });
		input.dispatchEvent(mouseLeaveEvent);
	});

	it("should prevent default and stop propagation on change", async () => {
		const onChange = vi.fn().mockResolvedValue(undefined);
		root.render(<Checkbox {...defaultProps} onChange={onChange} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		const event = new Event("change", { bubbles: true, cancelable: true });
		Object.defineProperty(event, "isTrusted", { value: true });
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

		input.dispatchEvent(event);

		expect(preventDefaultSpy).toHaveBeenCalled();
		expect(stopPropagationSpy).toHaveBeenCalled();
	});

	it("should prevent default and stop propagation on Enter keydown", async () => {
		const onChange = vi.fn().mockResolvedValue(undefined);
		root.render(<Checkbox {...defaultProps} onChange={onChange} />);
		const input = container.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement;

		const event = new KeyboardEvent("keydown", {
			bubbles: true,
			cancelable: true,
			key: "Enter",
		});
		Object.defineProperty(event, "isTrusted", { value: true });
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

		input.dispatchEvent(event);

		expect(preventDefaultSpy).toHaveBeenCalled();
		expect(stopPropagationSpy).toHaveBeenCalled();
	});
});
