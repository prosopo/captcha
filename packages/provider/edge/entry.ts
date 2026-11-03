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

// @ts-expect-error resolved by the bunny runtime, not by tsc or node
import * as BunnySDK from "https://esm.sh/@bunny.net/edgescript-sdk@0.13.0-rc.0";
import { parseSealKeys } from "../src/api/captcha/assetSealFormat.js";
import {
	type AssetSealHandler,
	createAssetSealHandler,
} from "../src/edge/assetSealHandler.js";

interface PullZoneHandler {
	onClientRequest: (
		middleware: (ctx: { request: Request }) => Promise<Request | Response>,
	) => PullZoneHandler;
	onOriginRequest: (
		middleware: (ctx: { request: Request }) => Promise<Request | Response>,
	) => PullZoneHandler;
}

interface EdgeSdk {
	net: {
		http: { servePullZone: (options: { url: string }) => PullZoneHandler };
	};
}

const sdk: EdgeSdk = BunnySDK as EdgeSdk;

const required = (name: string): string => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is not set on this edge script`);
	}
	return value;
};

const handler: AssetSealHandler = createAssetSealHandler({
	keys: parseSealKeys(required("PROSOPO_ASSET_SEAL_KEYS")),
	urlPrefix: process.env.PROSOPO_ASSET_SEAL_URL_PREFIX || "s",
	...(process.env.PROSOPO_ASSET_SEAL_PATH_PREFIX
		? { requiredPathPrefix: process.env.PROSOPO_ASSET_SEAL_PATH_PREFIX }
		: {}),
});

const pullZone = sdk.net.http.servePullZone({
	url: process.env.PROSOPO_ASSET_ORIGIN_URL || "https://localhost",
});

pullZone
	.onClientRequest((ctx: { request: Request }) => handler(ctx.request))
	.onOriginRequest((ctx: { request: Request }) => handler(ctx.request));
