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
import { ProcaptchaPow } from "@prosopo/procaptcha-pow";
import React from "react";
import { CaptchaElement } from "../captcha.js";

class PowCaptcha extends CaptchaElement {
	public override render() {
		const { config, callbacks } = this.props;

		return <ProcaptchaPow config={config} callbacks={callbacks} />;
	}
}

export { PowCaptcha };
