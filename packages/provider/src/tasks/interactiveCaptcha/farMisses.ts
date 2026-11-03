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

import type { AccountSighting, IPInfoResponse } from "@prosopo/types";
import { isPrivateRelay } from "../spam/checkTrafficFilter.js";

export const FAR_MISS_WINDOW = "10m" as const;
export const MAX_FAR_MISSES_PER_ACCOUNT = 3;
export const MAX_FAR_MISSES_PER_IP = 4;

export const MAX_SINGLE_BROWSER_USER_AGENTS = 4;

export const isAttributableAddress = (
	ipInfo: IPInfoResponse | undefined,
): boolean =>
	ipInfo?.isValid === true &&
	ipInfo.sharedReason === undefined &&
	!ipInfo.isMobile &&
	!ipInfo.isCrawler &&
	!isPrivateRelay(ipInfo);

export const isAttributableAccount = (
	sighting: AccountSighting | undefined,
): boolean =>
	sighting !== undefined &&
	sighting.userAgents7d <= MAX_SINGLE_BROWSER_USER_AGENTS;
