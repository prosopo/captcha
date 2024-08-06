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
import { ProsopoEnvError } from "@prosopo/common";
import { wifToPrivateKey } from "../lib/sep256k1Sign.js";

export const getPrivateKey = () => {
	const secret = process.env.PROSOPO_ZELCORE_PRIVATE_KEY;
	if (!secret) {
		throw new ProsopoEnvError("DEVELOPER.MISSING_ENV_VARIABLE", {
			context: { missingEnvVars: ["PROSOPO_ZELCORE_PRIVATE_KEY"] },
		});
	}
	return wifToPrivateKey(secret);
};

export const getPublicKey = () => {
	const secret = process.env.PROSOPO_ZELCORE_PUBLIC_KEY;
	if (!secret) {
		throw new ProsopoEnvError("DEVELOPER.MISSING_ENV_VARIABLE", {
			context: { missingEnvVars: ["PROSOPO_ZELCORE_PUBLIC_KEY"] },
		});
	}

	return secret;
};
