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
import axios, { AxiosRequestConfig } from "axios";
import { HttpError } from "./HttpError.js";

export class HttpClientBase {
	protected readonly baseURL: string;

	constructor(baseURL: string, prefix = "") {
		this.baseURL = baseURL + prefix;
	}

	protected async fetch<T>(input: RequestInfo, config: AxiosRequestConfig = {}): Promise<T> {
		config.timeout = config.timeout || 5000; // default timeout of 5 seconds
		try {
			const response = await axios.get(this.baseURL + input, config);
			return response.data;
		} catch (error) {
			return this.errorHandler(error as Error);
		}
	}

	protected async post<T, U>(
		input: RequestInfo,
		body: U,
		config: AxiosRequestConfig = {},
	): Promise<T> {
		config.headers = config.headers || {};
		config.headers["Content-Type"] = "application/json";
		config.timeout = config.timeout || 5000; // default timeout of 5 seconds
		try {
			const response = await axios.post(this.baseURL + input, body, config);
			return response.data;
		} catch (error) {
			return this.errorHandler(error as Error);
		}
	}

	protected errorHandler(error: Error): Promise<never> {
		if (error instanceof HttpError) {
			console.error("HTTP error:", error);
		} else {
			console.error("API request error:", error);
		}
		return Promise.reject(error);
	}
}

export default HttpClientBase;
