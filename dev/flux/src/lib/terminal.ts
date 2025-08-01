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
import { LogLevel, getLogger } from "@prosopo/common";
import { loadEnv } from "@prosopo/dotenv";
import { io } from "socket.io-client";
import { main as authMain, verifyLogin } from "./auth.js";
import { getSocketURL } from "./url.js";

loadEnv();
const logger = getLogger(LogLevel.enum.info, "flux.lib.terminal");

export async function main(
	publicKey: string,
	privateKey: Uint8Array,
	appName: string,
	ip?: string,
) {
	let running = true;
	try {
		// Get auth details
		const { nodeAPIURL, nodeLoginPhrase, nodeSignature } = await authMain(
			publicKey,
			privateKey,
			appName,
			ip,
		);

		// Login to the node
		await verifyLogin(publicKey, nodeSignature, nodeLoginPhrase, nodeAPIURL);

		const selectedIp = nodeAPIURL.toString();
		const url = selectedIp.split(":")[0];
		if (!url) throw new Error("No url");
		const socketUrl = getSocketURL(nodeAPIURL);

		const socket = io(socketUrl.href);
		socket.on("connect", () => {
			logger.info(() => ({ data: { socketId: socket.id }, msg: "connected" }));
		});
		socket.on("message", (message) => {
			socket.emit("message", {
				message,
				id: socket.id,
			});
		});
		socket.on("connect_error", (err) => {
			logger.error(() => ({ err }));
		});
		socket.on("disconnect", () => {
			logger.info(() => ({ msg: "disconnected" }));
			running = false;
		});
		socket.on("error", (e) => {
			logger.error(() => ({ err: e }));
			running = false;
		});
		while (running) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	} catch (e) {
		console.error(e);
		running = false;
	}
}
