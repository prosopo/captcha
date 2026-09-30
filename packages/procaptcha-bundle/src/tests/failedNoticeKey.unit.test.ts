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

import { translationKeys } from "@prosopo/locale";
import { describe, expect, test } from "vitest";
import { FAILED_NOTICE_KEY } from "../util/failedNoticeKey.js";

describe("failed challenge notice", () => {
	// i18next returns an unknown key as-is, so a typo here would put the raw
	// key in front of the user instead of the message.
	test("is a key the locales actually define", () => {
		expect(translationKeys).toContain(FAILED_NOTICE_KEY);
	});
});
