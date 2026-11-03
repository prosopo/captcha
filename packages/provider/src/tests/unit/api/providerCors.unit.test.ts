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

import { BUNDLE_ORIGIN_HEADER, BUNDLE_VERSION_HEADER } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { providerCorsOptions } from "../../../api/startProviderApi.js";

describe("providerCorsOptions", () => {
	// A header the widget sends but the provider does not allow fails the
	// browser's preflight, and the widget can no longer reach the provider.
	it.each([BUNDLE_VERSION_HEADER, BUNDLE_ORIGIN_HEADER])(
		"allows the widget's %s header",
		(header: string) => {
			expect(providerCorsOptions.allowedHeaders).toContain(header);
		},
	);
});
