// Copyright 2021-2026 Prosopo (UK) Ltd.
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
import { isDesktopWebKit, isIPad, isWebKit } from "../utils/browser";

export default function getPlatform(): string {
	// Android Chrome 86 and 87 and Android Firefox 80 and 84 don't mock the platform value when desktop mode is requested
	const { platform } = navigator;

	// iOS mocks the platform value when desktop version is requested: https://github.com/fingerprintjs/fingerprintjs/issues/514
	// iPad uses desktop mode by default since iOS 13
	// The value is 'MacIntel' on M1 Macs
	// The value is 'iPhone' on iPod Touch
	if (platform === "MacIntel") {
		if (isWebKit() && !isDesktopWebKit()) {
			return isIPad() ? "iPad" : "iPhone";
		}
	}

	return platform;
}
