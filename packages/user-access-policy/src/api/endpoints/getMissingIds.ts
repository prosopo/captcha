// Copyright 2021-2025 Prosopo (UK) Ltd.
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
    type ApiEndpoint,
    type ApiEndpointResponse,
    ApiEndpointResponseStatus,
} from "@prosopo/api-route";
import type {AllKeys, Logger} from "@prosopo/common";
import {type ZodType, z} from "zod";
import type {
    AccessRulesStorage,
} from "#policy/rulesStorage.js";

export type MissingIds = string[];

type MissingIdsSchema = ZodType<MissingIds>;

export type MissingIdsResponse = {
    ids: string[];
};

export const missingIdsResponse = z.object({
    ids: z.string().array(),
} satisfies AllKeys<MissingIdsResponse>) satisfies ZodType<MissingIdsResponse>;

export type MissingIdsEndpointResponse = ApiEndpointResponse & {
    data?: MissingIdsResponse;
};

export class GetMissingIdsEndpoint implements ApiEndpoint<MissingIdsSchema> {
    public constructor(
        private readonly accessRulesStorage: AccessRulesStorage,
        private readonly logger: Logger,
    ) {
    }

    public getRequestArgsSchema(): MissingIdsSchema {
        return z.string().array();
    }

    async processRequest(
        args: MissingIds,
    ): Promise<MissingIdsEndpointResponse> {
        const missingIds = await this.accessRulesStorage.getMissingRuleIds(args);

        this.logger.info(() => ({
            msg: "Endpoint checked missing ids",
            data: {
                idsToCheck: args.length,
                missingIds: missingIds.length,
            },
        }));

        this.logger.debug(() => ({
            msg: "Missing id details",
            data: {
                idsToCheck: args,
                missingIds: missingIds,
            },
        }));

        return {
            status: ApiEndpointResponseStatus.SUCCESS,
            data: {
                ids: missingIds,
            },
        };
    }
}
