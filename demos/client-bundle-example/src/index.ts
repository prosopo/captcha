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
//@ts-nocheck
(() => {
	function whenDOMReady(fn: () => void) {
		if (document.readyState !== "loading") fn();
		else document.addEventListener("DOMContentLoaded", fn);
	}

	whenDOMReady(() => {
		const wrappers = Array.from(
			document.querySelectorAll(".mui-textfield--float-label"),
		);

		for (const wrapper of wrappers) {
			const input = wrapper.querySelector("input, textarea, select");
			const label = wrapper.querySelector("label");
			if (!input || !label) return;

			// ensure screen-reader accessibility if label is hidden
			if (!input.getAttribute("aria-label") && label.textContent) {
				input.setAttribute("aria-label", label.textContent.trim());
			}

			const update = () => {
				const isChecked = input.type === "checkbox" || input.type === "radio";
				const hasValue = isChecked
					? input.checked
					: input.value && input.value.trim() !== "";
				if (document.activeElement === input || hasValue) {
					wrapper.classList.add("label-hidden");
				} else {
					wrapper.classList.remove("label-hidden");
				}
			};

			// respond to common input events
			for (const evt of [
				"focus",
				"input",
				"blur",
				"change",
				"keyup",
				"paste",
			]) {
				input.addEventListener(evt, update, { passive: true });
			}

			// initial run (handles pre-filled values)
			update();
		}

		// short polling window to detect autofill (stops after ~3s)
		const maxChecks = 12;
		let checks = 0;
		const iv = setInterval(() => {
			checks++;
			for (const w of wrappers) {
				const input = w.querySelector("input,textarea,select");
				if (input) input.dispatchEvent(new Event("input", { bubbles: true }));
			}
			if (checks >= maxChecks) clearInterval(iv);
		}, 250);
	});
})();
