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
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { RulesMongooseStorage } from "@rules/mongoose/rulesMongooseStorage.js";
import type { RulesStorage } from "@rules/storage/rulesStorage.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getRuleMongooseSchema } from "@rules/mongoose/schemas/getRuleMongooseSchema.js";
import {RULE_IPV6_NUMERIC_MAX_LENGTH} from "@rules/rule/ip/v6/ruleIpV6NumericMaxLength.js";

describe("ipV6RuleFormatting", async () => {
    const mongoServer = await MongoMemoryServer.create();
    const mongoConnection = await mongoose.connect(mongoServer.getUri());

    const model = mongoConnection.model(
        "UserAccessPolicyRules",
        getRuleMongooseSchema(),
    );

    await model.syncIndexes();

    const rulesStorage: RulesStorage = new RulesMongooseStorage(model);

    beforeEach(async () => {
        await model.deleteMany({});
    });

    afterAll(async () => {
        await mongoConnection.disconnect();
        await mongoServer.stop();
    });

    it("insertAddsZerosToShortIp",async ()=>{
        // given
        const ipV6AsNumericString = "1";
        const ipV6AsString = "::1";
        const fullLengthNumericIpV6String = "1".padStart(
            RULE_IPV6_NUMERIC_MAX_LENGTH,
            "0",
        );

        // when
        const record = await rulesStorage.insert({
            isUserBlocked: true,
            userIp: {
                v6: {
                    asNumericString: ipV6AsNumericString,
                    asString: ipV6AsString,
                },
            },
        });

        // then
        expect(record.userIp?.v6?.asNumericString).toBe(
            fullLengthNumericIpV6String,
        );
    });

    it("insertDoesNotAddZerosToFullIp",async ()=>{
        // given
        const ipV6AsNumericString = "42541956123769884636017138956568135816";
        const ipV6AsString = "2001:4860:4860::8888";

        // when
        const record = await rulesStorage.insert({
            isUserBlocked: true,
            userIp: {
                v6: {
                    asNumericString: ipV6AsNumericString,
                    asString: ipV6AsString,
                },
            },
        });

        // then
        expect(record.userIp?.v6?.asNumericString).toBe(ipV6AsNumericString);
    });

    it("insertAddsZerosToShortRangeMin",async ()=>{
        // given
        const rangeMinAsNumericString = "1";
        const fullLengthRangeMinNumericString = "1".padStart(
            RULE_IPV6_NUMERIC_MAX_LENGTH,
            "0",
        );

        // when
        const record = await rulesStorage.insert({
            isUserBlocked: true,
            userIp: {
                v6: {
                    asNumericString: "0",
                    asString: "0",
                    mask: {
                        rangeMinAsNumericString: rangeMinAsNumericString,
                        rangeMaxAsNumericString: "0",
                        asNumeric: 0,
                    },
                },
            },
        });

        // then
        expect(record.userIp?.v6?.mask?.rangeMinAsNumericString).toBe(
            fullLengthRangeMinNumericString,
        );
    });

    it("insertDoesNotAddZerosToFullRangeMin",async ()=>{
        // given
        const rangeMinAsNumericString = "42541956123769884636017138956568135816";

        // when
        const record = await rulesStorage.insert({
            isUserBlocked: true,
            userIp: {
                v6: {
                    asNumericString: "0",
                    asString: "0",
                    mask: {
                        rangeMinAsNumericString: rangeMinAsNumericString,
                        rangeMaxAsNumericString: "0",
                        asNumeric: 0,
                    },
                },
            },
        });

        // then
        expect(record.userIp?.v6?.mask?.rangeMinAsNumericString).toBe(
            rangeMinAsNumericString,
        );
    });

    it("insertAddsZerosToShortRangeMax",async ()=>{
        // given
        const rangeMaxAsNumericString = "1";
        const fullLengthRangeMaxNumericString = "1".padStart(
            RULE_IPV6_NUMERIC_MAX_LENGTH,
            "0",
        );

        // when
        const record = await rulesStorage.insert({
            isUserBlocked: true,
            userIp: {
                v6: {
                    asNumericString: "0",
                    asString: "0",
                    mask: {
                        rangeMinAsNumericString: "0",
                        rangeMaxAsNumericString: rangeMaxAsNumericString,
                        asNumeric: 0,
                    },
                },
            },
        });

        // then
        expect(record.userIp?.v6?.mask?.rangeMaxAsNumericString).toBe(
            fullLengthRangeMaxNumericString,
        );
    });

    it("insertDoesNotAddZerosToFullRangeMax",async ()=>{
        // given
        const rangeMaxAsNumericString = "42541956123769884636017138956568135816";

        // when
        const record = await rulesStorage.insert({
            isUserBlocked: true,
            userIp: {
                v6: {
                    asNumericString: "0",
                    asString: "0",
                    mask: {
                        rangeMinAsNumericString: "0",
                        rangeMaxAsNumericString: rangeMaxAsNumericString,
                        asNumeric: 0,
                    },
                },
            },
        });

        // then
        expect(record.userIp?.v6?.mask?.rangeMaxAsNumericString).toBe(
            rangeMaxAsNumericString,
        );
    });
});
