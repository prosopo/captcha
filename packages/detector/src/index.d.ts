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

import { Account } from '@prosopo/types';
import { BehavioralData } from '@prosopo/types';
import { ClickEventPoint } from '@prosopo/types';
import { EnvironmentTypes } from '@prosopo/types';
import { MouseMovementPoint } from '@prosopo/types';
import { PackedBehavioralData } from '@prosopo/types';
import { TouchEventPoint } from '@prosopo/types';

declare const detect: (env: EnvironmentTypes, container: HTMLElement | undefined, restart: () => void, accountGenerator: () => Promise<Account>) => Promise<{
    token: string;
    shadowDomCleanup: () => void;
    encryptHeadHash: string;
    mouseTracker?: {
        start: () => void;
        stop: () => void;
        getData: () => MouseMovementPoint[];
        clear: () => void;
    };
    touchTracker?: {
        start: () => void;
        stop: () => void;
        getData: () => TouchEventPoint[];
        clear: () => void;
    };
    clickTracker?: {
        start: () => void;
        stop: () => void;
        getData: () => ClickEventPoint[];
        clear: () => void;
    };
    hasTouchSupport?: string;
    encryptBehavioralData?: (data: string) => Promise<string>;
    packBehavioralData?: (behavioralData: BehavioralData) => PackedBehavioralData;
    userAccount: Account;
}>;
export default detect;

/**
 * Hybrid encryption: AES-GCM for data, RSA-OAEP for symmetric key
 * Returns JSON string: {"key": "<base64>", "data": "<base64>", "iv": "<base64>"}
 */
export declare function encryptData(data: string): Promise<string>;

declare type RandomProviderSelectorFn = (env: EnvironmentTypes, entropy: number) => Promise<RandomProvider>;

export { }
