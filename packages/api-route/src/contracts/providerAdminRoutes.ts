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

import {
	AdminApiPaths,
	ClearAllCountersBody,
	ClearAllCountersResponse,
	type DnsEventData,
	DnsEventIngestBatchSchema,
	GetAllDecisionMachinesBody,
	GetAllDecisionMachinesResponse,
	GetDecisionMachineBody,
	GetDecisionMachineResponse,
	GetSessionBody,
	type GetSessionData,
	type MaintenanceModeData,
	RegisterSitekeyBody,
	RegisterSitekeysBody,
	RemoveAllDecisionMachinesBody,
	RemoveAllDecisionMachinesResponse,
	RemoveDecisionMachineBody,
	RemoveDecisionMachineResponse,
	RemoveSitekeyBody,
	RemoveSitekeysBody,
	ReplaceDetectorPoolBody,
	type ReplaceDetectorPoolData,
	ToggleMaintenanceModeBody,
	UpdateDecisionMachineBody,
	type UpdateDecisionMachineData,
} from "@prosopo/types";
import { type ZodType, z } from "zod";
import { type ApiRouteContract, defineApiRoute } from "../apiRouteContract.js";

// Admin routes are ApiEndpoints, so the response schema describes the `data`
// field of the { status, data, error } envelope rather than the whole body.

export const registerSiteKeyRoute: ApiRouteContract<
	AdminApiPaths.SiteKeyRegister,
	typeof RegisterSitekeyBody,
	undefined
> = defineApiRoute({
	path: AdminApiPaths.SiteKeyRegister,
	method: "post",
	requestSchema: RegisterSitekeyBody,
	responseSchema: undefined,
});

export const registerSiteKeysRoute: ApiRouteContract<
	AdminApiPaths.SiteKeysRegister,
	typeof RegisterSitekeysBody,
	undefined
> = defineApiRoute({
	path: AdminApiPaths.SiteKeysRegister,
	method: "post",
	requestSchema: RegisterSitekeysBody,
	responseSchema: undefined,
});

export const removeSiteKeyRoute: ApiRouteContract<
	AdminApiPaths.SiteKeyRemove,
	typeof RemoveSitekeyBody,
	undefined
> = defineApiRoute({
	path: AdminApiPaths.SiteKeyRemove,
	method: "post",
	requestSchema: RemoveSitekeyBody,
	responseSchema: undefined,
});

export const removeSiteKeysRoute: ApiRouteContract<
	AdminApiPaths.SiteKeysRemove,
	typeof RemoveSitekeysBody,
	undefined
> = defineApiRoute({
	path: AdminApiPaths.SiteKeysRemove,
	method: "post",
	requestSchema: RemoveSitekeysBody,
	responseSchema: undefined,
});

export const toggleMaintenanceModeRoute: ApiRouteContract<
	AdminApiPaths.ToggleMaintenanceMode,
	typeof ToggleMaintenanceModeBody,
	ZodType<MaintenanceModeData>
> = defineApiRoute({
	path: AdminApiPaths.ToggleMaintenanceMode,
	method: "post",
	requestSchema: ToggleMaintenanceModeBody,
	responseSchema: z.custom<MaintenanceModeData>(),
});

export const updateDecisionMachineRoute: ApiRouteContract<
	AdminApiPaths.UpdateDecisionMachine,
	typeof UpdateDecisionMachineBody,
	ZodType<UpdateDecisionMachineData>
> = defineApiRoute({
	path: AdminApiPaths.UpdateDecisionMachine,
	method: "post",
	requestSchema: UpdateDecisionMachineBody,
	responseSchema: z.custom<UpdateDecisionMachineData>(),
});

export const getAllDecisionMachinesRoute: ApiRouteContract<
	AdminApiPaths.GetAllDecisionMachines,
	typeof GetAllDecisionMachinesBody,
	typeof GetAllDecisionMachinesResponse
> = defineApiRoute({
	path: AdminApiPaths.GetAllDecisionMachines,
	method: "post",
	requestSchema: GetAllDecisionMachinesBody,
	responseSchema: GetAllDecisionMachinesResponse,
});

export const getDecisionMachineRoute: ApiRouteContract<
	AdminApiPaths.GetDecisionMachine,
	typeof GetDecisionMachineBody,
	typeof GetDecisionMachineResponse
> = defineApiRoute({
	path: AdminApiPaths.GetDecisionMachine,
	method: "post",
	requestSchema: GetDecisionMachineBody,
	responseSchema: GetDecisionMachineResponse,
});

export const removeDecisionMachineRoute: ApiRouteContract<
	AdminApiPaths.RemoveDecisionMachine,
	typeof RemoveDecisionMachineBody,
	typeof RemoveDecisionMachineResponse
> = defineApiRoute({
	path: AdminApiPaths.RemoveDecisionMachine,
	method: "post",
	requestSchema: RemoveDecisionMachineBody,
	responseSchema: RemoveDecisionMachineResponse,
});

export const removeAllDecisionMachinesRoute: ApiRouteContract<
	AdminApiPaths.RemoveAllDecisionMachines,
	typeof RemoveAllDecisionMachinesBody,
	typeof RemoveAllDecisionMachinesResponse
> = defineApiRoute({
	path: AdminApiPaths.RemoveAllDecisionMachines,
	method: "post",
	requestSchema: RemoveAllDecisionMachinesBody,
	responseSchema: RemoveAllDecisionMachinesResponse,
});

export const clearAllCountersRoute: ApiRouteContract<
	AdminApiPaths.ClearAllCounters,
	typeof ClearAllCountersBody,
	typeof ClearAllCountersResponse
> = defineApiRoute({
	path: AdminApiPaths.ClearAllCounters,
	method: "post",
	requestSchema: ClearAllCountersBody,
	responseSchema: ClearAllCountersResponse,
});

export const dnsEventRoute: ApiRouteContract<
	AdminApiPaths.DnsEvent,
	typeof DnsEventIngestBatchSchema,
	ZodType<DnsEventData>
> = defineApiRoute({
	path: AdminApiPaths.DnsEvent,
	method: "post",
	requestSchema: DnsEventIngestBatchSchema,
	responseSchema: z.custom<DnsEventData>(),
});

export const replaceDetectorPoolRoute: ApiRouteContract<
	AdminApiPaths.ReplaceDetectorPool,
	typeof ReplaceDetectorPoolBody,
	ZodType<ReplaceDetectorPoolData>
> = defineApiRoute({
	path: AdminApiPaths.ReplaceDetectorPool,
	method: "post",
	requestSchema: ReplaceDetectorPoolBody,
	responseSchema: z.custom<ReplaceDetectorPoolData>(),
});

export const getSessionRoute: ApiRouteContract<
	AdminApiPaths.GetSession,
	typeof GetSessionBody,
	ZodType<GetSessionData>
> = defineApiRoute({
	path: AdminApiPaths.GetSession,
	method: "post",
	requestSchema: GetSessionBody,
	responseSchema: z.custom<GetSessionData>(),
});
