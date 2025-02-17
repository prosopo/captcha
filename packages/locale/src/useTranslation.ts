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

import {
	type UseTranslationOptions,
	type UseTranslationResponse,
	useTranslation as useTranslationDefault,
} from "react-i18next";
import initializeI18n from "./i18nFrontend.js";

function useTranslation(
	options?: UseTranslationOptions<"translation">,
	// biome-ignore lint/suspicious/noExplicitAny: TODO replace any
): UseTranslationResponse<"translation", any> & {
	t: ReturnType<typeof initializeI18n>["t"];
} {
	const i18n = initializeI18n();
	return useTranslationDefault("translation", { i18n, ...options });
}

export default useTranslation;
