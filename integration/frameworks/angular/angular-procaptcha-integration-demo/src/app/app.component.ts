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

import { Component } from "@angular/core";
import { ProcaptchaComponent } from "@prosopo/angular-procaptcha-wrapper";
import { environment } from "../environments/environment";

@Component({
	selector: "app-root",
	imports: [ProcaptchaComponent],
	template: `<procaptcha-component [settings]="{siteKey:procaptchaSiteKey}"
                        [htmlAttributes]="{class:'my-app__procaptcha'}"/>`,
	styles: "",
})
export class AppComponent {
	procaptchaSiteKey = environment.PROCATCHA_SITE_KEY;
}
