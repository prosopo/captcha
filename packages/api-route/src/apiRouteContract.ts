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

import type { ZodType, z } from "zod";

export type ApiRouteMethod = "get" | "post" | "put" | "patch" | "delete";

type OptionalSchema = ZodType | undefined;
type InferOptional<Schema extends OptionalSchema> = Schema extends ZodType
	? z.infer<Schema>
	: undefined;

// Holds only the path, method and schemas, never a handler, so a browser
// client can import it without pulling in server code.
export type ApiRouteContract<
	Path extends string = string,
	Request extends OptionalSchema = OptionalSchema,
	Response extends OptionalSchema = OptionalSchema,
> = {
	path: Path;
	method: ApiRouteMethod;
	requestSchema: Request;
	responseSchema: Response;
};

export type ApiRouteRequest<Contract extends ApiRouteContract> = InferOptional<
	Contract["requestSchema"]
>;

export type ApiRouteResponseData<Contract extends ApiRouteContract> =
	InferOptional<Contract["responseSchema"]>;

export const defineApiRoute = <
	const Path extends string,
	Request extends OptionalSchema,
	Response extends OptionalSchema,
>(
	contract: ApiRouteContract<Path, Request, Response>,
): ApiRouteContract<Path, Request, Response> => contract;
