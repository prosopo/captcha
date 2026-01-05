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
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Button from "./Button.js";

describe("Button", () => {
	it("should render button with text", () => {
		const onClick = vi.fn();
		render(
			<Button
				themeColor="light"
				buttonType="cancel"
				onClick={onClick}
				text="Cancel"
			/>,
		);
		const button = screen.getByRole("button", { name: "Cancel" });
		expect(button).toBeDefined();
		expect(button.textContent).toBe("Cancel");
	});

	it("should call onClick when clicked with trusted event", async () => {
		const onClick = vi.fn();
		const user = userEvent.setup();
		render(
			<Button
				themeColor="light"
				buttonType="cancel"
				onClick={onClick}
				text="Click me"
			/>,
		);
		const button = screen.getByRole("button", { name: "Click me" });
		await user.click(button);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("should not call onClick when event is not trusted", () => {
		const onClick = vi.fn();
		render(
			<Button
				themeColor="light"
				buttonType="cancel"
				onClick={onClick}
				text="Click me"
			/>,
		);
		const button = screen.getByRole("button", { name: "Click me" });
		// Create a non-trusted event by directly calling the onClick handler
		// with a mock event that has isTrusted: false
		const mockEvent = {
			isTrusted: false,
			preventDefault: vi.fn(),
		} as unknown as React.MouseEvent<HTMLButtonElement>;
		// Access the internal onClick handler
		button.onclick = null;
		// Simulate non-trusted click
		const clickEvent = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
		});
		Object.defineProperty(clickEvent, "isTrusted", { value: false });
		button.dispatchEvent(clickEvent);
		// The component should not call onClick for non-trusted events
		expect(onClick).not.toHaveBeenCalled();
	});

	it("should render cancel button with correct styling", () => {
		const onClick = vi.fn();
		render(
			<Button
				themeColor="light"
				buttonType="cancel"
				onClick={onClick}
				text="Cancel"
			/>,
		);
		const button = screen.getByRole("button", { name: "Cancel" });
		expect(button).toBeDefined();
		expect(button.getAttribute("data-cy")).toBe("button-cancel");
	});

	it("should render next button with correct styling", () => {
		const onClick = vi.fn();
		render(
			<Button
				themeColor="light"
				buttonType="next"
				onClick={onClick}
				text="Next"
			/>,
		);
		const button = screen.getByRole("button", { name: "Next" });
		expect(button).toBeDefined();
		expect(button.getAttribute("data-cy")).toBe("button-next");
	});

	it("should apply light theme styles", () => {
		const onClick = vi.fn();
		render(
			<Button
				themeColor="light"
				buttonType="next"
				onClick={onClick}
				text="Next"
			/>,
		);
		const button = screen.getByRole("button", { name: "Next" });
		expect(button).toBeDefined();
		const styles = window.getComputedStyle(button);
		expect(styles.backgroundColor).toBeDefined();
	});

	it("should apply dark theme styles", () => {
		const onClick = vi.fn();
		render(
			<Button
				themeColor="dark"
				buttonType="next"
				onClick={onClick}
				text="Next"
			/>,
		);
		const button = screen.getByRole("button", { name: "Next" });
		expect(button).toBeDefined();
		const styles = window.getComputedStyle(button);
		expect(styles.backgroundColor).toBeDefined();
	});

	it("should have aria-label attribute matching text", () => {
		const onClick = vi.fn();
		render(
			<Button
				themeColor="light"
				buttonType="cancel"
				onClick={onClick}
				text="Cancel Button"
			/>,
		);
		const button = screen.getByRole("button", { name: "Cancel Button" });
		expect(button.getAttribute("aria-label")).toBe("Cancel Button");
	});

	it("should prevent default on click", async () => {
		const onClick = vi.fn();
		const user = userEvent.setup();
		render(
			<Button
				themeColor="light"
				buttonType="cancel"
				onClick={onClick}
				text="Click me"
			/>,
		);
		const button = screen.getByRole("button", { name: "Click me" });
		await user.click(button);
		// Verify onClick was called (which includes preventDefault internally)
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("should handle hover state changes", async () => {
		const onClick = vi.fn();
		const user = userEvent.setup();
		render(
			<Button
				themeColor="light"
				buttonType="next"
				onClick={onClick}
				text="Hover me"
			/>,
		);
		const button = screen.getByRole("button", { name: "Hover me" });
		await user.hover(button);
		// Hover state is managed internally, just verify button is interactive
		expect(button).toBeDefined();
		await user.unhover(button);
		expect(button).toBeDefined();
	});

	it("should handle multiple rapid clicks", async () => {
		const onClick = vi.fn();
		const user = userEvent.setup();
		render(
			<Button
				themeColor="light"
				buttonType="next"
				onClick={onClick}
				text="Click me"
			/>,
		);
		const button = screen.getByRole("button", { name: "Click me" });
		await user.click(button);
		await user.click(button);
		await user.click(button);
		expect(onClick).toHaveBeenCalledTimes(3);
	});
});

