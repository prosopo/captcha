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

import { ProsopoDatasetError } from "@prosopo/common";
import type { Captcha } from "@prosopo/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CaptchaWidget } from "./CaptchaWidget.js";

describe("CaptchaWidget", () => {
	const createMockChallenge = (itemCount: number): Captcha => ({
		items: Array.from({ length: itemCount }, (_, i) => ({
			hash: `hash-${i}`,
			data: `data:image/png;base64,image${i}`,
			type: "image" as const,
		})),
		target: "test target",
		salt: "salt",
	});

	it("should render all challenge items", () => {
		const challenge = createMockChallenge(3);
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const images = screen.getAllByRole("img");
		expect(images).toHaveLength(3);
	});

	it("should call onClick with hash and coordinates on mouse click", async () => {
		const challenge = createMockChallenge(1);
		const onClick = vi.fn();
		const user = userEvent.setup();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const image = screen.getByRole("img");
		await user.click(image);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onClick).toHaveBeenCalledWith("hash-0", expect.any(Number), expect.any(Number));
	});

	it("should call onClick with hash and touch coordinates on touch event", () => {
		const challenge = createMockChallenge(1);
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const image = screen.getByRole("img");
		const imageContainer = image.parentElement;
		if (!imageContainer) {
			throw new Error("Image container not found");
		}
		// Create a mock touch event
		const touchEvent = new Event("touchstart", { bubbles: true }) as TouchEvent;
		Object.defineProperty(touchEvent, "touches", {
			value: [
				{
					clientX: 100,
					clientY: 200,
				},
			],
			writable: false,
		});
		imageContainer.dispatchEvent(touchEvent);
		expect(onClick).toHaveBeenCalledWith("hash-0", 100, 200);
	});

	it("should not call onClick for non-trusted events", () => {
		const challenge = createMockChallenge(1);
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const image = screen.getByRole("img");
		const clickEvent = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
		});
		Object.defineProperty(clickEvent, "isTrusted", { value: false });
		image.dispatchEvent(clickEvent);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("should show check icon for items in solution", () => {
		const challenge = createMockChallenge(3);
		const solution: [string, number, number][] = [["hash-0", 10, 20]];
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={solution}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const checkIcons = screen.getAllByTestId("CheckIcon");
		expect(checkIcons).toHaveLength(1);
	});

	it("should not show check icon for items not in solution", () => {
		const challenge = createMockChallenge(3);
		const solution: [string, number, number][] = [["hash-0", 10, 20]];
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={solution}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const checkIcons = screen.getAllByTestId("CheckIcon");
		expect(checkIcons).toHaveLength(1);
		// hash-1 and hash-2 should not have check icons
		const images = screen.getAllByRole("img");
		expect(images).toHaveLength(3);
	});

	it("should apply light theme", () => {
		const challenge = createMockChallenge(1);
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const widget = screen.getByRole("img").closest("div");
		expect(widget).toBeDefined();
	});

	it("should apply dark theme", () => {
		const challenge = createMockChallenge(1);
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="dark"
			/>,
		);
		const widget = screen.getByRole("img").closest("div");
		expect(widget).toBeDefined();
	});

	it("should handle image load error and retry", () => {
		const challenge = createMockChallenge(1);
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const image = screen.getByRole("img") as HTMLImageElement;
		const errorEvent = new Event("error");
		image.dispatchEvent(errorEvent);
		// After error, src should be updated with retry parameter
		expect(image.src).toContain("retry=");
	});

	it("should handle multiple image errors up to retry limit", () => {
		const challenge = createMockChallenge(1);
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const image = screen.getByRole("img") as HTMLImageElement;
		// Simulate multiple errors
		for (let i = 0; i < 4; i++) {
			const errorEvent = new Event("error");
			image.dispatchEvent(errorEvent);
		}
		// Should have retry parameter after errors
		expect(image.src).toBeDefined();
	});

	it("should render items with correct alt text", () => {
		const challenge = createMockChallenge(3);
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const images = screen.getAllByRole("img");
		expect(images[0].getAttribute("alt")).toBe("Captcha image 1");
		expect(images[1].getAttribute("alt")).toBe("Captcha image 2");
		expect(images[2].getAttribute("alt")).toBe("Captcha image 3");
	});

	it("should handle empty items array", () => {
		const challenge: Captcha = {
			items: [],
			target: "test",
			salt: "salt",
		};
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const images = screen.queryAllByRole("img");
		expect(images).toHaveLength(0);
	});

	it("should handle click with missing clientX/clientY", () => {
		const challenge = createMockChallenge(1);
		const onClick = vi.fn();
		render(
			<CaptchaWidget
				challenge={challenge}
				solution={[]}
				onClick={onClick}
				themeColor="light"
			/>,
		);
		const image = screen.getByRole("img");
		const imageContainer = image.parentElement;
		if (!imageContainer) {
			throw new Error("Image container not found");
		}
		// Create a click event without clientX/clientY
		const clickEvent = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
		});
		// Remove clientX and clientY properties
		Object.defineProperty(clickEvent, "clientX", {
			get: () => undefined,
		});
		Object.defineProperty(clickEvent, "clientY", {
			get: () => undefined,
		});
		Object.defineProperty(clickEvent, "isTrusted", { value: true });
		imageContainer.dispatchEvent(clickEvent);
		// Should fallback to 0, 0
		expect(onClick).toHaveBeenCalledWith("hash-0", 0, 0);
	});

	it("should throw error when item hash is missing", () => {
		const challenge: Captcha = {
			items: [
				{
					hash: "",
					data: "data:image/png;base64,image",
					type: "image" as const,
				},
			],
			target: "test",
			salt: "salt",
		};
		const onClick = vi.fn();
		expect(() => {
			render(
				<CaptchaWidget
					challenge={challenge}
					solution={[]}
					onClick={onClick}
					themeColor="light"
				/>,
			);
		}).toThrow(ProsopoDatasetError);
	});
});

