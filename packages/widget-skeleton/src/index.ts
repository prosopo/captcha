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

import { CheckboxElementFactory } from "./htmlElements/checkboxElementFactory.js";
import { LogoElementFactory } from "./htmlElements/logoElementFactory.js";
import { WidgetSkeletonElementFactory } from "./htmlElements/widgetSkeletonElementFactory.js";
import { WebComponentFactory } from "./webComponent/webComponentFactory.js";
import { WidgetSkeletonComponentCreator } from "./webComponent/widgetSkeletonComponentCreator.js";
import type { WidgetInteractiveAreaProvider } from "./widgetInteractiveAreaProvider.js";
import type { WidgetSkeletonFactory } from "./widgetSkeletonFactory.js";

const checkboxElementFactory = new CheckboxElementFactory();

const getWidgetSkeletonFactory = (): WidgetSkeletonFactory => {
	const logoElementFactory = new LogoElementFactory();

	const widgetSkeletonElementFactory = new WidgetSkeletonElementFactory(
		checkboxElementFactory,
		logoElementFactory,
	);

	const webComponentFactory = new WebComponentFactory("prosopo-procaptcha");

	return new WidgetSkeletonComponentCreator(
		widgetSkeletonElementFactory,
		webComponentFactory,
		checkboxElementFactory,
	);
};

export {
	type WidgetSkeletonFactory,
	type WidgetInteractiveAreaProvider,
	getWidgetSkeletonFactory,
};

export * from "./theme.js";
export * from "./constants.js";
