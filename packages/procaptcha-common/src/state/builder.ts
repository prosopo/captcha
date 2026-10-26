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
import type { ProcaptchaState, ProcaptchaStateUpdateFn } from "@prosopo/types";

export const buildUpdateState =
	(state: ProcaptchaState, onStateUpdate: ProcaptchaStateUpdateFn) =>
	(nextState: Partial<ProcaptchaState>) => {
		// mutate the current state. Note that this is in order of properties in the nextState object.
		// e.g. given {b: 2, c: 3, a: 1}, b will be set, then c, then a. This is because JS stores fields in insertion order by default, unless you override it with a class or such by changing the key enumeration order.
		Object.assign(state, nextState);
		// then call the update function for the frontend to do the same
		onStateUpdate(nextState);
	};
