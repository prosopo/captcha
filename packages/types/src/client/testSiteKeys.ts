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

// Reserved, well-known site keys for CI/CD and integration testing. They are
// constant across production, staging and development. The provider forces a
// deterministic verdict for these keys (ALWAYS_PASS_SITE_KEY always verifies,
// ALWAYS_FAIL_SITE_KEY never does), bypassing the real captcha flow.
//
// This is intentionally honoured in every environment, mirroring Google
// reCAPTCHA's public test keys: the override only weakens protection for a dapp
// that deliberately opts in by configuring one of these keys (a token and its
// /verify are bound to the dapp's own site key, so it cannot be used against a
// site protected by a real key), and the widget renders a visible warning so it
// can never be shipped to production unnoticed.
export const ALWAYS_PASS_SITE_KEY =
	"5EARALUe4HXQwKo5KanZSGGKqJV4VTaytpezFwv8ZHbZewmh";
export const ALWAYS_FAIL_SITE_KEY =
	"5ETtechmZkn3CUVeJX7Z511oiuiu742aHLm91D5ZZw4fqoAG";

export enum TestSiteKeyMode {
	Pass = "pass",
	Fail = "fail",
}

// Returns the forced behaviour for a reserved test site key, or null for any
// normal site key (the overwhelmingly common case).
export const getTestSiteKeyMode = (siteKey: string): TestSiteKeyMode | null => {
	if (siteKey === ALWAYS_PASS_SITE_KEY) {
		return TestSiteKeyMode.Pass;
	}
	if (siteKey === ALWAYS_FAIL_SITE_KEY) {
		return TestSiteKeyMode.Fail;
	}
	return null;
};
