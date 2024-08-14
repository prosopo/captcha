import path from "node:path";
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
// TODO use the .contract file instead of the .json and .wasm files. Polkadot-JS apps is also erroring out when using
//   the .wasm and .json files. The .contract file works but I don't know why.
import { Abi } from "@polkadot/api-contract";
import { hexToU8a, isWasm } from "@polkadot/util";
import { ProsopoError } from "@prosopo/common";
import fse from "fs-extra";

const __dirname = path.resolve();
export async function AbiJSON(filePath: string): Promise<Abi> {
	const resolvedFilePath = path.resolve(__dirname, filePath);
	await fse.ensureFile(resolvedFilePath);
	const fileExists = await fse.pathExists(resolvedFilePath);

	if (fileExists) {
		const json = JSON.parse(
			await fse.readFile(resolvedFilePath, {
				encoding: "utf8",
			}),
		);
		return new Abi(json);
	}
	throw new ProsopoError("FS.FILE_NOT_FOUND", {
		context: { error: `File ${filePath} does not exist` },
	});
}

export async function Wasm(filePath: string): Promise<Uint8Array> {
	const resolvedFilePath = path.resolve(__dirname, filePath);
	await fse.ensureFile(resolvedFilePath);
	const fileExists = await fse.pathExists(resolvedFilePath);
	if (fileExists) {
		const wasm: `0x${string}` = `0x${fse.readFileSync(resolvedFilePath).toString("hex")}`;
		const wasmBytes = hexToU8a(wasm);

		if (isWasm(wasmBytes)) {
			return wasmBytes;
		}
		console.error(`Error loading contract wasm: ${wasm.slice(0, 10)}...`);
		process.exit(1);
	} else {
		throw new ProsopoError("FS.FILE_NOT_FOUND", {
			context: { error: `File ${filePath} does not exist` },
		});
	}
}
