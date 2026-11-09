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

export enum accessRuleApiPaths {
	// delete
	DELETE_ALL = "/v1/prosopo/user-access-policy/rules/delete-all",
	DELETE_GROUPS = "/v1/prosopo/user-access-policy/rules/delete-groups",
	DELETE_MANY = "/v1/prosopo/user-access-policy/rules/delete-many",
	// read
	FETCH_MANY = "/v1/prosopo/user-access-policy/rules/fetch-many",
	FIND_IDS = "/v1/prosopo/user-access-policy/rules/find-ids",
	GET_MISSING_IDS = "/v1/prosopo/user-access-policy/rules/get-missing-ids",
	// write
	INSERT_MANY = "/v1/prosopo/user-access-policy/rules/insert-many",
	REHASH_ALL = "/v1/prosopo/user-access-policy/rules/rehash-all",
}
