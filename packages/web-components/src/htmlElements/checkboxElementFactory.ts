// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import type { Theme } from "../theme.js";
import type { HtmlElementFactory } from "./htmlElementFactory.js";

class CheckboxElementFactory implements HtmlElementFactory {
	createHtmlElement(theme: Theme): HTMLElement {
		const checkbox = document.createElement("div");

		checkbox.outerHTML = this.getStyles(theme) + this.getMarkup();

		return checkbox;
	}

	protected getMarkup(): string {
		return `
<div class="checkbox">
    <div class="checkbox__outer">
        <div class="checkbox__wrapper">
            <div class="checkbox__inner">
                <div class="checkbox__content">
                    <div class="checkbox__loading-spinner" aria-label="Loading spinner"></div>
                </div>
            </div>
        </div>
    </div>
</div>
`;
	}

	protected getStyles(theme: Theme): string {
		return `
<style>
.checkbox {
    display: flex;
    flex-direction: column;
}

.checkbox__outer {
    align-items: center;
    flex: 1;
}

.checkbox__wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    vertical-align: middle;
}

.checkbox__inner {
    display: flex;
}

.checkbox__content {
    display: inline-flex;
}

.checkbox__loading-spinner {
    margin-top: 0;
    margin-left: 15px;
    margin-right: 15px;
    width: 2em;
    height: 2em;
    border: 4px solid ${theme.palette.background.contrastText};
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inherit;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;

    @keyframes rotation {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
}
</style>
`;
	}
}

export { CheckboxElementFactory };
