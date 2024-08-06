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
import { ProsopoApiError } from "@prosopo/common";
export async function streamToJson(
	stream: ReadableStream<Uint8Array>,
	// biome-ignore lint/suspicious/noExplicitAny: TODO set return type?
): Promise<Record<any, any>> {
	return await new Response(stream).json();
}

export const errorHandler = async <T>(response: Response) => {
	if (!response.ok) {
		throw new ProsopoApiError("API.BAD_REQUEST", {
			context: {
				error: `HTTP error! status: ${response.status}`,
				code: response.status,
			},
		});
	}
	if (response.body && !response.bodyUsed) {
		const data = await streamToJson(response.body);

		if (data.status === "error") {
			throw new ProsopoApiError("API.BAD_REQUEST", {
				context: {
					error: `HTTP error! status: ${data.data.message} `,
					code: response.status,
				},
			});
		}
		return data as T;
	}
	return {} as T;
};
