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

import {WidgetWebComponentFactory} from "./webComponent/widgetWebComponentFactory.js";
import {WebComponentFactory} from "./webComponent/webComponentFactory.js";
import {WidgetElementFactory} from "./htmlElements/widgetElementFactory.js";
import {CheckboxElementFactory} from "./htmlElements/checkboxElementFactory.js";
import {LogoElementFactory} from "./htmlElements/logo/logoElementFactory.js";
import {LogoSvgIconFactory} from "./htmlElements/logo/logoSvgIconFactory.js";
import type {WidgetFactory} from "./widgetFactory.js";

const getWidgetFactory = (): WidgetFactory => {
    const checkboxElementFactory = new CheckboxElementFactory();
    const logoSvgIconFactory = new LogoSvgIconFactory();
    const logoElementFactory = new LogoElementFactory(logoSvgIconFactory);

    const widgetElementFactory = new WidgetElementFactory(checkboxElementFactory, logoElementFactory);

    const webComponentFactory = new WebComponentFactory();

    return new WidgetWebComponentFactory(widgetElementFactory, webComponentFactory);
};

/*todo:
* 1. run build:all
* react components were removed from the current package.
* also, move Reload.tsx to the right place, and
* rename WidgetConstants to Constants.
* 2. rename web-components to 'widget'
* 3. update dependencies: remove express and react
* 4. update 'procaptcha-bundle': remove webComponentFactory and use from the current one
* */

export * from "./theme.js";
export * from "./WidgetConstants.js";
export * from "./Reload.js";

export {
    type WidgetFactory,
    getWidgetFactory,
};
