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

import { CaptchaType } from "@prosopo/types";
import type React from "react";
import type { CaptchaProps } from "./captcha.js";
import { FrictionlessCaptcha } from "./components/frictionlessCaptcha.js";
import { ImageCaptcha } from "./components/imageCaptcha.js";
import { PowCaptcha } from "./components/powCaptcha.js";

const componentsList: Record<CaptchaType, React.ComponentType<CaptchaProps>> = {
	[CaptchaType.image]: ImageCaptcha,
	[CaptchaType.pow]: PowCaptcha,
	[CaptchaType.frictionless]: FrictionlessCaptcha,
};

export { componentsList };
