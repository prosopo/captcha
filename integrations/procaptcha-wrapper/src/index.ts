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

import type {ProcaptchaOptions} from "./procaptchaOptions.js";
import type {ProcaptchaWrapper} from "./procaptchaWrapper.js";
import type {WidgetCallbacks} from "./widget/widgetCallbacks.js";
import {
    type WidgetCaptchaType,
    WidgetCaptchaTypes,
} from "./widget/widgetCaptchaTypes.js";
import {type WidgetTheme, WidgetThemes} from "./widget/widgetThemes.js";
import {WidgetWrapper} from "./widget/widgetWrapper.js";

const procaptchaWrapper: ProcaptchaWrapper = new WidgetWrapper();

export {
    type WidgetCallbacks,
    type ProcaptchaOptions,
    type WidgetTheme,
    type WidgetCaptchaType,
    type ProcaptchaWrapper,
    WidgetThemes,
    WidgetCaptchaTypes,
    procaptchaWrapper,
};
