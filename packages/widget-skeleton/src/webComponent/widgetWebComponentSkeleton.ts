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

import { CheckboxElementFactory } from "../htmlElements/checkboxElementFactory.js";
import { LogoElementFactory } from "../htmlElements/logoElementFactory.js";
import { WidgetSkeletonElementFactory } from "../htmlElements/widgetSkeletonElementFactory.js";
import type { WidgetSkeleton } from "../widgetSkeleton.js";
import type { WidgetSkeletonFactory } from "../widgetSkeletonFactory.js";
import { createWebComponent } from "./createWebComponent.js";
import { WidgetSkeletonComponentFactory } from "./widgetSkeletonComponentFactory.js";

interface ImportMetaByVite {
	env?: {
		MODE?: string;
	};
}

class WidgetWebComponentSkeleton implements WidgetSkeleton {
	public getFactory(): WidgetSkeletonFactory {
		const checkboxElementFactory = new CheckboxElementFactory();
		const logoElementFactory = new LogoElementFactory();

		const widgetSkeletonElementFactory = new WidgetSkeletonElementFactory(
			checkboxElementFactory,
			logoElementFactory,
			this.isInDevelopmentMode(),
		);

		return new WidgetSkeletonComponentFactory(
			widgetSkeletonElementFactory,
			"prosopo-procaptcha",
			checkboxElementFactory,
		);
	}

	public isInDevelopmentMode(): boolean {
		return "production" !== this.getCurrentEnvironmentMode();
	}

	protected getCurrentEnvironmentMode(): string | undefined {
		if (typeof process !== "undefined") {
			return process.env.NODE_ENV;
		}

		return (import.meta as ImportMetaByVite).env?.MODE;
	}
}

export { WidgetWebComponentSkeleton };
