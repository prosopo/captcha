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

import type { Server } from "node:http";
import type { ProsopoServerConfigOutput } from "@prosopo/types";
import type express from "express";
import type { Connection } from "mongoose";
import { assertType, describe, expectTypeOf, test } from "vitest";
import {
	type ProsopoVerificationType,
	createApp,
	isDevelopmentOrTest,
	main,
	resolvePort,
	resolveVerifyEndpoint,
	resolveVerifyType,
	startServer,
} from "../app.js";
import { isAuth, login, signup } from "../controllers/auth.js";
import type UserSchema from "../models/user.js";
import type { UserInterface } from "../models/user.js";
import getRoutes from "../routes/routes.js";
import connectionFactory from "../utils/connection.js";
import memoryServerSetup from "../utils/database.js";

describe("the app module's types", () => {
	test("the environment readers take no arguments", () => {
		expectTypeOf(resolveVerifyEndpoint).parameters.toEqualTypeOf<[]>();
		expectTypeOf(resolveVerifyEndpoint).returns.toEqualTypeOf<string>();
		expectTypeOf(
			resolveVerifyType,
		).returns.toEqualTypeOf<ProsopoVerificationType>();
		expectTypeOf(isDevelopmentOrTest).returns.toEqualTypeOf<boolean>();
	});

	test("the verification type is a closed set", () => {
		expectTypeOf<`${ProsopoVerificationType}`>().toEqualTypeOf<
			"api" | "local"
		>();
		// @ts-expect-error - anything else has to fall back to the API at runtime.
		assertType<ProsopoVerificationType>("carrier-pigeon");
	});

	test("the port comes from the shared server config, not a loose object", () => {
		expectTypeOf(resolvePort)
			.parameter(0)
			.toEqualTypeOf<ProsopoServerConfigOutput>();
		expectTypeOf(resolvePort).returns.toEqualTypeOf<number>();
	});

	test("createApp yields an express app the caller can mount routes on", () => {
		expectTypeOf(createApp).returns.toEqualTypeOf<express.Express>();
	});

	test("startServer's module directory is optional and it returns a server", () => {
		expectTypeOf(startServer).parameter(1).toEqualTypeOf<number>();
		expectTypeOf(startServer).parameter(2).toEqualTypeOf<string | undefined>();
		expectTypeOf(startServer).returns.toEqualTypeOf<Server>();
	});

	test("main resolves to the server it started, so a caller can close it", () => {
		expectTypeOf(main).parameters.toEqualTypeOf<[]>();
		expectTypeOf(main).returns.toEqualTypeOf<Promise<Server>>();
	});
});

describe("the router's types", () => {
	test("routes are built from a connection, config and verification settings", () => {
		expectTypeOf(getRoutes).parameters.toEqualTypeOf<
			[Connection, ProsopoServerConfigOutput, string, string]
		>();
		expectTypeOf(getRoutes).returns.toEqualTypeOf<express.Router>();
	});

	test("every argument is required", () => {
		// @ts-expect-error - a router with no verification settings would
		// silently accept unverified signups.
		getRoutes({} as Connection, {} as ProsopoServerConfigOutput, "endpoint");
	});
});

describe("the controllers' types", () => {
	test("signup and login are express handlers with their context bound first", () => {
		expectTypeOf(signup).parameter(0).toEqualTypeOf<Connection>();
		expectTypeOf(signup)
			.parameter(1)
			.toEqualTypeOf<ProsopoServerConfigOutput>();
		expectTypeOf(signup).parameter(2).toEqualTypeOf<string>();
		expectTypeOf(signup).parameter(3).toEqualTypeOf<string>();
		expectTypeOf(signup).returns.toExtend<Promise<unknown>>();
		expectTypeOf(login).parameter(0).toEqualTypeOf<Connection>();
		expectTypeOf(login).returns.toEqualTypeOf<Promise<void>>();
	});

	test("isAuth needs nothing bound, so it mounts directly", () => {
		expectTypeOf(isAuth).parameters.toEqualTypeOf<
			[express.Request, express.Response]
		>();
	});
});

describe("the persistence types", () => {
	test("connectionFactory takes a URI and returns a mongoose connection", () => {
		expectTypeOf(connectionFactory).parameters.toEqualTypeOf<[string]>();
		expectTypeOf(connectionFactory).returns.toEqualTypeOf<Connection>();
	});

	test("the memory server hands back a URI string", () => {
		expectTypeOf(memoryServerSetup).parameters.toEqualTypeOf<[]>();
		expectTypeOf(memoryServerSetup).returns.toEqualTypeOf<Promise<string>>();
	});

	test("the user schema is typed by the interface it stores", () => {
		expectTypeOf<keyof typeof UserSchema.obj>().toEqualTypeOf<
			keyof UserInterface
		>();
		expectTypeOf<UserInterface>().toEqualTypeOf<{
			id: number;
			email: string;
			name: string;
			password: string;
			salt: string;
		}>();
	});

	test("a user document cannot be built without credentials", () => {
		// @ts-expect-error - salt is what makes the stored hash meaningful.
		assertType<UserInterface>({
			id: 1,
			email: "user@example.com",
			name: "user",
			password: "0xhash",
		});
	});
});
