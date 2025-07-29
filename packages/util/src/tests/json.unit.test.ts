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
import { describe, expect, it, test } from "vitest";
import { jsonDecode, jsonEncode } from "../json.js";

describe("json", () => {

    const str = '{"a":{"type":"bigint","value":"1"},"b":"hello","c":[{"type":"bigint","value":"1"},{"type":"bigint","value":"2"},{"type":"bigint","value":"3"}]}'
    const obj = {
        a: 1n,
        b: "hello",
        c: [1n, 2n, 3n]
    };

    test("encode obj with bigint", () => {
        expect(jsonEncode(obj)).to.deep.equal(str);
    });

    test("decode obj with bigint", () => {
        expect(jsonDecode(str)).to.deep.equal(obj);
    });
});
