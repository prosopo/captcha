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
import type { Logger } from "@prosopo/common";
import type { Address4, Address6 } from "ip-address";
import type RulesStorage from "./storage/rulesStorage.js";

class RequestRulesInspector {
    public constructor(
        private readonly rulesStorage: RulesStorage,
        private readonly environmentReadinessWaiter: () => Promise<void>,
        private readonly logger: Logger | null,
    ) {}

    public async shouldAbortRequest(
        rawIp: string,
        requestHeaders: Record<string, unknown>,
        requestBody: Record<string, unknown>,
    ): Promise<boolean> {
        if (!rawIp) {
            this.logger?.info("Request without IP", {
                requestHeaders: requestHeaders,
                requestBody: requestBody,
            });

            return true;
        }

        try {
            // todo
            const ipAddress = getIpAddress(rawIp);

            return await this.isRequestFromBlockedUser(
                ipAddress,
                requestHeaders,
                requestBody,
            );
        } catch (err) {
            this.logger?.error("Block Middleware Error:", err);

            return true;
        }
    }

    protected async isRequestFromBlockedUser(
        ipAddress: Address4 | Address6,
        requestHeaders: Record<string, unknown>,
        requestBody: Record<string, unknown>,
    ): Promise<boolean> {
        const { userId, clientId } = this.extractIdsFromRequest(
            requestHeaders,
            requestBody,
        );

        await this.environmentReadinessWaiter();

        return await this.isUserBlocked(clientId, ipAddress, userId);
    }

    protected extractIdsFromRequest(
        requestHeaders: Record<string, unknown>,
        requestBody: Record<string, unknown>,
    ): {
        userId: string;
        clientId: string;
    } {
        const userId =
            this.getObjectValue(requestHeaders, "Prosopo-User") ||
            this.getObjectValue(requestBody, "user") ||
            "";
        const clientId =
            this.getObjectValue(requestHeaders, "Prosopo-Site-Key") ||
            this.getObjectValue(requestBody, "dapp") ||
            "";

        return {
            userId: "string" === typeof userId ? userId : "",
            clientId: "string" === typeof clientId ? clientId : "",
        };
    }

    protected getObjectValue(
        object: Record<string, unknown>,
        key: string,
    ): unknown {
        return object[key];
    }

    protected async isUserBlocked(
        clientId: string,
        ipAddress: Address4 | Address6,
        userId: string,
    ): Promise<boolean> {
        const accessRules = await this.rulesStorage.find(
            {
                clientId: clientId,
                userIpAddress: ipAddress,
                userId: userId,
            },
            {
                includeRecordsWithPartialFilterMatches: true,
                includeRecordsWithoutClientId: true,
            },
        );

        const blockingRules = accessRules.filter(
            (accessRule) => accessRule.isUserBlocked,
        );

        return blockingRules.length > 0;
    }
}

export default RequestRulesInspector;
