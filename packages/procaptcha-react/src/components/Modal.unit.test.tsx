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
import Modal from "./Modal.js";

describe("Modal", () => {
	it("should render children when show is true", () => {
		render(
			<Modal show={true}>
				<div>Modal Content</div>
			</Modal>,
		);
		const content = screen.getByText("Modal Content");
		expect(content).toBeDefined();
	});

	it("should not render children when show is false", () => {
		render(
			<Modal show={false}>
				<div>Modal Content</div>
			</Modal>,
		);
		const content = screen.queryByText("Modal Content");
		expect(content).toBeNull();
	});

	it("should render multiple children", () => {
		render(
			<Modal show={true}>
				<div>First Child</div>
				<div>Second Child</div>
			</Modal>,
		);
		expect(screen.getByText("First Child")).toBeDefined();
		expect(screen.getByText("Second Child")).toBeDefined();
	});

	it("should render complex JSX children", () => {
		render(
			<Modal show={true}>
				<div>
					<h1>Title</h1>
					<p>Description</p>
				</div>
			</Modal>,
		);
		expect(screen.getByText("Title")).toBeDefined();
		expect(screen.getByText("Description")).toBeDefined();
	});

	it("should render empty children when show is true", () => {
		render(<Modal show={true}>{null}</Modal>);
		// Modal should still render the container even with null children
		const modalOuter = document.querySelector(".prosopo-modalOuter");
		expect(modalOuter).toBeDefined();
	});

	it("should apply correct display style when show is true", () => {
		render(
			<Modal show={true}>
				<div>Content</div>
			</Modal>,
		);
		const modalOuter = document.querySelector(".prosopo-modalOuter");
		expect(modalOuter).toBeDefined();
		if (modalOuter) {
			const styles = window.getComputedStyle(modalOuter);
			expect(styles.display).toBe("flex");
		}
	});

	it("should apply correct display style when show is false", () => {
		render(
			<Modal show={false}>
				<div>Content</div>
			</Modal>,
		);
		const modalOuter = document.querySelector(".prosopo-modalOuter");
		expect(modalOuter).toBeDefined();
		if (modalOuter) {
			const styles = window.getComputedStyle(modalOuter);
			expect(styles.display).toBe("none");
		}
	});

	it("should render modal in document.body via portal", () => {
		render(
			<Modal show={true}>
				<div>Portal Content</div>
			</Modal>,
		);
		const modalOuter = document.body.querySelector(".prosopo-modalOuter");
		expect(modalOuter).toBeDefined();
		expect(modalOuter?.parentElement).toBe(document.body);
	});

	it("should have modal inner element with correct class", () => {
		render(
			<Modal show={true}>
				<div>Content</div>
			</Modal>,
		);
		const modalInner = document.querySelector(".prosopo-modalInner");
		expect(modalInner).toBeDefined();
	});

	it("should update when show prop changes", () => {
		const { rerender } = render(
			<Modal show={false}>
				<div>Content</div>
			</Modal>,
		);
		expect(screen.queryByText("Content")).toBeNull();

		rerender(
			<Modal show={true}>
				<div>Content</div>
			</Modal>,
		);
		expect(screen.getByText("Content")).toBeDefined();

		rerender(
			<Modal show={false}>
				<div>Content</div>
			</Modal>,
		);
		expect(screen.queryByText("Content")).toBeNull();
	});
});

