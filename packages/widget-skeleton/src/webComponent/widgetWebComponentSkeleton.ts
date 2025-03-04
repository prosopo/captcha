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
import { WebComponentFactory } from "./webComponentFactory.js";
import { WidgetSkeletonComponentFactory } from "./widgetSkeletonComponentFactory.js";

class WidgetWebComponentSkeleton implements WidgetSkeleton {
	getFactory(): WidgetSkeletonFactory {
		const checkboxElementFactory = new CheckboxElementFactory();
		const logoElementFactory = new LogoElementFactory();

		const widgetSkeletonElementFactory = new WidgetSkeletonElementFactory(
			checkboxElementFactory,
			logoElementFactory,
			this.isInDevelopmentMode(),
		);

		const webComponentFactory = new WebComponentFactory("prosopo-procaptcha");

		return new WidgetSkeletonComponentFactory(
			widgetSkeletonElementFactory,
			webComponentFactory,
			checkboxElementFactory,
		);
	}

	isInDevelopmentMode(): boolean {
		if ("undefined" === typeof process) {
			return false;
		}

		const productionEnvironment = "production";

		const currentEnvironment = process.env?.NODE_ENV || productionEnvironment;

		return productionEnvironment !== currentEnvironment.toLowerCase();
	}
}

export { WidgetWebComponentSkeleton };
