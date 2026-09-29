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

import type { ClientMetaData } from "@prosopo/types";
import { resolveClientSessionId } from "./protectSession.js";

/**
 * Assembles the widget-controlled metadata attached to a captcha solution.
 * Shared by the image, PoW and puzzle managers so a new field only has to be
 * threaded in once.
 *
 * Returns `undefined` when nothing is set, so the submission body omits the
 * key entirely rather than carrying an empty object.
 *
 * A site that renders no session id of its own but runs Prosopo Protect falls
 * back to Protect's session id, which is the same value Protect's own
 * challenge page renders the widget with. Read here rather than at render time
 * because Protect initialises asynchronously and may not have a session yet
 * when the widget mounts.
 *
 * @param hp - live honeypot input value, if the honeypot was filled in
 * @param clientSessionId - the site's session id, if the widget was rendered
 *   with `data-sessionid` / `renderOptions.sessionId`
 */
export const buildClientMetaData = (
	hp?: string,
	clientSessionId?: string,
): ClientMetaData | undefined => {
	const sessionId = resolveClientSessionId(clientSessionId);
	const clientMetaData: ClientMetaData = {
		...(hp && { hp }),
		...(sessionId && { clientSessionId: sessionId }),
	};

	return Object.keys(clientMetaData).length > 0 ? clientMetaData : undefined;
};
