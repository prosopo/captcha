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

import type { ApiRoutes, ApiRoutesProvider } from "@prosopo/api-route";
import { AdminApiPaths } from "@prosopo/types";
import type { Tasks } from "../../tasks/index.js";
import { ApiGetAllDecisionMachinesEndpoint } from "./apiGetAllDecisionMachinesEndpoint.js";
import { ApiGetDecisionMachineEndpoint } from "./apiGetDecisionMachineEndpoint.js";
import { ApiRegisterSiteKeyEndpoint } from "./apiRegisterSiteKeyEndpoint.js";
import { ApiRemoveAllDecisionMachinesEndpoint } from "./apiRemoveAllDecisionMachinesEndpoint.js";
import { ApiRemoveDecisionMachineEndpoint } from "./apiRemoveDecisionMachineEndpoint.js";
import { ApiRemoveDetectorKeyEndpoint } from "./apiRemoveDetectorKeyEndpoint.js";
import { ApiToggleMaintenanceModeEndpoint } from "./apiToggleMaintenanceModeEndpoint.js";
import { ApiUpdateDecisionMachineEndpoint } from "./apiUpdateDecisionMachineEndpoint.js";
import { ApiUpdateDetectorKeyEndpoint } from "./apiUpdateDetectorKeyEndpoint.js";

class ApiAdminRoutesProvider implements ApiRoutesProvider {
	public constructor(private readonly tasks: Tasks) {}

	public getRoutes(): ApiRoutes {
		return {
			[AdminApiPaths.SiteKeyRegister]: new ApiRegisterSiteKeyEndpoint(
				this.tasks.clientTaskManager,
			),
			[AdminApiPaths.UpdateDetectorKey]: new ApiUpdateDetectorKeyEndpoint(
				this.tasks.clientTaskManager,
			),
			[AdminApiPaths.RemoveDetectorKey]: new ApiRemoveDetectorKeyEndpoint(
				this.tasks.clientTaskManager,
			),
			[AdminApiPaths.UpdateDecisionMachine]:
				new ApiUpdateDecisionMachineEndpoint(this.tasks.clientTaskManager),
			[AdminApiPaths.GetAllDecisionMachines]:
				new ApiGetAllDecisionMachinesEndpoint(this.tasks.clientTaskManager),
			[AdminApiPaths.GetDecisionMachine]: new ApiGetDecisionMachineEndpoint(
				this.tasks.clientTaskManager,
			),
			[AdminApiPaths.RemoveDecisionMachine]:
				new ApiRemoveDecisionMachineEndpoint(this.tasks.clientTaskManager),
			[AdminApiPaths.RemoveAllDecisionMachines]:
				new ApiRemoveAllDecisionMachinesEndpoint(this.tasks.clientTaskManager),
			[AdminApiPaths.ToggleMaintenanceMode]:
				new ApiToggleMaintenanceModeEndpoint(),
		};
	}
}

export { ApiAdminRoutesProvider };
