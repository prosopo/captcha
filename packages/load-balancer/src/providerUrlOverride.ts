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
 * Supplies the provider list directly instead of fetching Prosopo's.
 *
 * A self-hosted deployment has its own providers and no hosted list to
 * discover them from. Setting this replaces both halves of discovery — the
 * endpoint the widget calls and the list a verifier matches a token against —
 * with whatever it names. See `getProviderListOverride` in `balancer.ts` for
 * the accepted forms.
 *
 * Distinct from `PROSOPO_PROVIDER_URL_DEVELOPMENT`, which only applies when
 * the environment is `development`. That coupling forced self-hosters to ship
 * a development build of the widget purely to redirect it; this override is
 * environment-independent, so `production` stays correct everywhere.
 *
 * Kept in its own module, holding nothing but the read, so that parsing can
 * live next to `convertHostedProvider` in `balancer.ts` without the two
 * modules importing each other. A cycle here would be bundled into the widget
 * and this package has already lost a release to one.
 *
 * Written as a static `process.env.X` access for the same reason as the
 * development override: frontend bundlers substitute that exact expression
 * for a literal, which a computed lookup would not match.
 */
export const readProviderListOverride = (): string | undefined => {
	try {
		return process.env.PROSOPO_PROVIDER_LIST;
	} catch {
		return undefined;
	}
};
