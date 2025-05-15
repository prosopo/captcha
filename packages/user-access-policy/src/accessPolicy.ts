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

import {z} from "zod";
import {Address4} from "ip-address";

export enum AccessPolicyType {
    Block = "block",
    Restrict = "restrict",
}

export const accessPolicySchema = z.object({
    type: z.nativeEnum(AccessPolicyType),
    description: z.coerce.string().optional(),
    // Redis stores values as strings, so coerce is needed to parse properly
    solvedImagesCount: z.coerce.number().optional(),
    unsolvedImagesCount: z.coerce.number().optional(),
    frictionlessScore: z.coerce.number().optional(),
});

export const policyScopeSchema = z.object({
    clientId: z.coerce.string().optional(),
});

export const userScopeSchema = z.object({
    // coerce is used for safety, as e.g., incoming userId can be digital
    userId: z.coerce.string().optional(),
    numericIp: z.coerce.bigint().optional(),
    numericIpMaskMin: z.coerce.bigint().optional(),
    numericIpMaskMax: z.coerce.bigint().optional(),
    ja4Hash: z.coerce.string().optional(),
    headersHash: z.coerce.string().optional(),
    userAgentHash: z.coerce.string().optional(),
});

export const userScopeInputSchema = userScopeSchema.extend({
    // human-friendly ip versions. If present, then converted to numeric and removed from the object
    // 127.0.0.1
    ip: z.string().optional(),
    // 127.0.0.1/24
    ipMask: z.string().optional(),
}).transform((inputUserScope) => {
    // this line creates a new "userScope", without ip and ipMask
    const {ip, ipMask, ...userScope} = inputUserScope;

    if ("string" === typeof ip) {
        userScope.numericIp = new Address4(ip).bigInt();
    }

    if ("string" === typeof ipMask) {
        const ipObject = new Address4(ipMask);

        userScope.numericIpMaskMin = ipObject.bigInt();
        userScope.numericIpMaskMax = ipObject.endAddress().bigInt();
    }

    return userScope;
});

export type AccessPolicy = z.output<typeof accessPolicySchema>;
export type PolicyScope = z.output<typeof policyScopeSchema>;
export type UserScope = z.output<typeof userScopeSchema>;
