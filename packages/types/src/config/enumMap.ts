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
import { type ZodEnum, type ZodTypeAny, record } from "zod";

export const enumMap = <T extends [string, ...string[]], U extends ZodTypeAny>(
	enumeration: ZodEnum<T>,
	obj: U,
) => {
	const validateKeysInEnum = <I>(
		record: Record<string, I>,
	): record is Record<
		(typeof enumeration.enum)[keyof typeof enumeration.enum], // Yes this is ugly
		I
	> => Object.keys(record).every((key) => enumeration.safeParse(key).success);
	return record(obj).refine(validateKeysInEnum);
};
