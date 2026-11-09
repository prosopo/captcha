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

import { type ApiRouteContract, defineApiRoute } from "@prosopo/api-route";
import { ProcaptchaResponse } from "@prosopo/types";
import { type ZodType, z } from "zod";

export const SubscribeBodySpec = ProcaptchaResponse.merge(
	z.object({
		email: z.string().email(),
		password: z.string(),
		siteKey: z.string(),
	}),
);

export type MessageResponse = { message: string };
export type HealthResponse = { status: "ok" };

const messageResponse: ZodType<MessageResponse> = z.object({
	message: z.string(),
});

export const loginRoute: ApiRouteContract<
	"/login",
	typeof SubscribeBodySpec,
	ZodType<MessageResponse>
> = defineApiRoute({
	path: "/login",
	method: "post",
	requestSchema: SubscribeBodySpec,
	responseSchema: messageResponse,
});

export const signupRoute: ApiRouteContract<
	"/signup",
	typeof SubscribeBodySpec,
	ZodType<MessageResponse>
> = defineApiRoute({
	path: "/signup",
	method: "post",
	requestSchema: SubscribeBodySpec,
	responseSchema: messageResponse,
});

export const privateRoute: ApiRouteContract<
	"/private",
	undefined,
	ZodType<MessageResponse>
> = defineApiRoute({
	path: "/private",
	method: "get",
	requestSchema: undefined,
	responseSchema: messageResponse,
});

export const publicRoute: ApiRouteContract<
	"/public",
	undefined,
	ZodType<MessageResponse>
> = defineApiRoute({
	path: "/public",
	method: "get",
	requestSchema: undefined,
	responseSchema: messageResponse,
});

export const healthRoute: ApiRouteContract<
	"/health",
	undefined,
	ZodType<HealthResponse>
> = defineApiRoute({
	path: "/health",
	method: "get",
	requestSchema: undefined,
	responseSchema: z.object({ status: z.literal("ok") }),
});
