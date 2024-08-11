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
import { ProsopoServerConfigSchema } from "@prosopo/types";

export const getServerConfig = () =>
	ProsopoServerConfigSchema.parse({
		defaultEnvironment: process.env.PROSOPO_DEFAULT_ENVIRONMENT, // enviromental variables
		defaultNetwork: process.env.PROSOPO_DEFAULT_NETWORK,
		serverUrl: getServerUrl(),
		dappName: process.env.PROSOPO_DAPP_NAME || "client-example-server",
		account: {
			password: "",
			address: process.env.PROSOPO_SITE_KEY || "",
			secret: process.env.PROSOPO_SITE_PRIVATE_KEY || "",
		},
	});

export const getServerUrl = (): string => {
	if (process.env.PROSOPO_SERVER_URL) {
		if (process.env.PROSOPO_SERVER_URL.match(/:\d+/)) {
			return process.env.PROSOPO_SERVER_URL;
		}
		return `${process.env.PROSOPO_SERVER_URL}:${process.env.PROSOPO_SERVER_PORT || 9228}`;
	}
	return "http://localhost:9228";
};
