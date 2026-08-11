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

export type {
	ApiRoutes,
	ApiRoutesProvider,
	// ApiRouteLimit is the value type of an ApiRouteLimits record: without it,
	// a consumer building one entry at a time has no way to name what it is
	// building, and has to redeclare the shape.
	ApiRouteLimit,
	ApiRouteLimits,
} from "./apiRoutes.js";
