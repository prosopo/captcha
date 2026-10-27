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

/**
 * Names the platform that embedded the widget (e.g. "mc4wp"), so the provider
 * can tell traffic from each integration apart.
 */
export const INTEGRATION_HEADER = "x-prosopo-integration";

const INTEGRATION_NAME = /^[a-z0-9][a-z0-9_-]{0,31}$/;

/** Lowercases a name and drops anything that is not a short slug. */
export const normaliseIntegration = (
	value: string | null | undefined,
): string | undefined => {
	const name: string | undefined = value?.trim().toLowerCase();
	return name && INTEGRATION_NAME.test(name) ? name : undefined;
};

export const integrationHeaders = (
	integration: string | undefined,
): Record<string, string> => {
	const name: string | undefined = normaliseIntegration(integration);
	return name ? { [INTEGRATION_HEADER]: name } : {};
};
