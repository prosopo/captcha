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
import { ProsopoError } from "@prosopo/common";
import { assetTokenOptionsFromEnv, signAssetUrl } from "./assetToken.js";

export async function downloadImage(url: string): Promise<Uint8Array> {
	try {
		const options = assetTokenOptionsFromEnv();
		const response = await fetch(
			options ? await signAssetUrl(url, options) : url,
		);
		if (!response.ok) {
			throw new ProsopoError({
				code: "INVALID_REQUEST",
				errorSite: "DSET-15",
				message: "BadRequest",
				context: {
					error: `Network response was not ok, status: ${response.status}`,
					url,
				},
			});
		}
		const buffer = await response.arrayBuffer();
		return new Uint8Array(buffer);
	} catch (err) {
		throw new ProsopoError({
			code: "DB_QUERY_FAILED",
			errorSite: "DSET-16",
			message: "Failed to get image",
			cause: err,
		});
	}
}
