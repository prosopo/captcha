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

import type { IPInfoResponse } from "@prosopo/types";

export interface IIpInfoService {
	initialize(): Promise<void>;
	lookup(ip: string): Promise<IPInfoResponse>;
	/**
	 * ISO 3166-1 alpha-2 country code from the local MaxMind database only.
	 * Synchronous and network-free, unlike `lookup()`. Undefined whenever no
	 * answer is available.
	 */
	country(ip: string): string | undefined;
	isAvailable(): boolean;
}
