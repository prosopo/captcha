import { Account } from '@prosopo/types';
import { BehavioralData } from '@prosopo/types';
import { ClickEventPoint } from '@prosopo/types';
import { EnvironmentTypes } from '@prosopo/types';
import { MouseMovementPoint } from '@prosopo/types';
import { PackedBehavioralData } from '@prosopo/types';
import { RandomProvider } from '@prosopo/types';
import { TouchEventPoint } from '@prosopo/types';

declare const detect: (env: EnvironmentTypes, randomProviderSelectorFn: RandomProviderSelectorFn, container: HTMLElement | undefined, restart: () => void, accountGenerator: () => Promise<Account>) => Promise<{
    token: string;
    provider?: RandomProvider;
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
