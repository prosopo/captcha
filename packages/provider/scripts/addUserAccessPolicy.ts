#!/usr/bin/env npx tsx
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

/**
 * Script to add user access policy rules to a local provider.
 *
 * Usage:
 *   npx tsx scripts/addUserAccessPolicy.ts --help
 *   npx tsx scripts/addUserAccessPolicy.ts --type block --countryCode RU
 *   npx tsx scripts/addUserAccessPolicy.ts --type block --countryCode RU --clientId YOUR_SITE_KEY
 *   npx tsx scripts/addUserAccessPolicy.ts --type restrict --countryCode CN --captchaType image --solvedImagesCount 5
 *   npx tsx scripts/addUserAccessPolicy.ts --type block --ip 192.168.1.100
 *   npx tsx scripts/addUserAccessPolicy.ts --type block --ipMask 192.168.1.0/24
 *
 * Environment variables required:
 *   PROSOPO_PROVIDER_MNEMONIC or PROSOPO_PROVIDER_SEED - Provider account secret
 *   PROSOPO_API_BASE_URL - Provider API base URL (default: http://localhost)
 *   PROSOPO_API_PORT - Provider API port (default: 9229)
 */

import { parseArgs } from "node:util";
import { getPair } from "@prosopo/keyring";
import {
	AccessPolicyType,
	AccessRulesApiClient,
	type InsertRulesGroup,
} from "@prosopo/user-access-policy";
import { CaptchaType } from "@prosopo/types";

interface RuleOptions {
	// Policy
	type: "block" | "restrict";
	description?: string;
	captchaType?: "image" | "pow" | "frictionless";
	solvedImagesCount?: number;
	unsolvedImagesCount?: number;
	powDifficulty?: number;
	imageThreshold?: number;
	frictionlessScore?: number;

	// Scope
	clientId?: string;

	// User attributes
	countryCode?: string;
	userId?: string;
	ip?: string;
	ipMask?: string;
	ja4Hash?: string;
	userAgent?: string;
	headHash?: string;
	coords?: string;

	// Other
	groupId?: string;
	expiresIn?: number; // seconds from now
}

function getProviderSecret(): string {
	const secret =
		process.env.PROSOPO_PROVIDER_MNEMONIC ||
		process.env.PROSOPO_PROVIDER_SEED ||
		process.env.PROSOPO_PROVIDER_URI;

	if (!secret) {
		console.error(
			"Error: PROSOPO_PROVIDER_MNEMONIC or PROSOPO_PROVIDER_SEED environment variable is required",
		);
		process.exit(1);
	}
	return secret;
}

function getProviderUrl(): string {
	const baseUrl = process.env.PROSOPO_API_BASE_URL || "http://localhost";
	const port = process.env.PROSOPO_API_PORT || "9229";
	return `${baseUrl}:${port}`;
}

function parseArguments(): RuleOptions {
	const { values } = parseArgs({
		options: {
			// Policy options
			type: { type: "string", short: "t" },
			description: { type: "string", short: "d" },
			captchaType: { type: "string" },
			solvedImagesCount: { type: "string" },
			unsolvedImagesCount: { type: "string" },
			powDifficulty: { type: "string" },
			imageThreshold: { type: "string" },
			frictionlessScore: { type: "string" },

			// Scope options
			clientId: { type: "string", short: "c" },

			// User attribute options
			countryCode: { type: "string" },
			userId: { type: "string", short: "u" },
			ip: { type: "string" },
			ipMask: { type: "string" },
			ja4Hash: { type: "string" },
			userAgent: { type: "string" },
			headHash: { type: "string" },
			coords: { type: "string" },

			// Other options
			groupId: { type: "string", short: "g" },
			expiresIn: { type: "string" },

			// Help
			help: { type: "boolean", short: "h" },
		},
		strict: true,
	});

	if (values.help) {
		printHelp();
		process.exit(0);
	}

	if (!values.type) {
		console.error("Error: --type is required (block or restrict)");
		printHelp();
		process.exit(1);
	}

	if (values.type !== "block" && values.type !== "restrict") {
		console.error('Error: --type must be "block" or "restrict"');
		process.exit(1);
	}

	// Must have at least one user scope attribute
	const hasUserScope =
		values.countryCode ||
		values.userId ||
		values.ip ||
		values.ipMask ||
		values.ja4Hash ||
		values.userAgent ||
		values.headHash ||
		values.coords;

	if (!hasUserScope) {
		console.error(
			"Error: At least one user scope attribute is required (--countryCode, --userId, --ip, --ipMask, --ja4Hash, --userAgent, --headHash, --coords)",
		);
		process.exit(1);
	}

	return {
		type: values.type as "block" | "restrict",
		description: values.description,
		captchaType: values.captchaType as "image" | "pow" | "frictionless",
		solvedImagesCount: values.solvedImagesCount
			? Number.parseInt(values.solvedImagesCount)
			: undefined,
		unsolvedImagesCount: values.unsolvedImagesCount
			? Number.parseInt(values.unsolvedImagesCount)
			: undefined,
		powDifficulty: values.powDifficulty
			? Number.parseInt(values.powDifficulty)
			: undefined,
		imageThreshold: values.imageThreshold
			? Number.parseFloat(values.imageThreshold)
			: undefined,
		frictionlessScore: values.frictionlessScore
			? Number.parseFloat(values.frictionlessScore)
			: undefined,
		clientId: values.clientId,
		countryCode: values.countryCode,
		userId: values.userId,
		ip: values.ip,
		ipMask: values.ipMask,
		ja4Hash: values.ja4Hash,
		userAgent: values.userAgent,
		headHash: values.headHash,
		coords: values.coords,
		groupId: values.groupId,
		expiresIn: values.expiresIn
			? Number.parseInt(values.expiresIn)
			: undefined,
	};
}

function printHelp(): void {
	console.log(`
Usage: npx tsx scripts/addUserAccessPolicy.ts [options]

Add user access policy rules to a local provider.

Policy Options:
  -t, --type <type>           Rule type: "block" or "restrict" (required)
  -d, --description <text>    Description of the rule
  --captchaType <type>        For restrict: "image", "pow", or "frictionless"
  --solvedImagesCount <n>     Number of images to solve
  --unsolvedImagesCount <n>   Number of unsolved images
  --powDifficulty <n>         PoW difficulty level
  --imageThreshold <n>        Image threshold (0-1)
  --frictionlessScore <n>     Frictionless score override

Scope Options:
  -c, --clientId <id>         Site key to apply the rule to (optional, global if omitted)

User Scope Options (at least one required):
  --countryCode <code>        ISO 3166-1 alpha-2 country code (e.g., US, GB, CN)
  -u, --userId <id>           User ID
  --ip <address>              IP address
  --ipMask <cidr>             IP range in CIDR notation (e.g., 192.168.1.0/24)
  --ja4Hash <hash>            JA4 fingerprint hash
  --userAgent <agent>         User agent string
  --headHash <hash>           Head hash
  --coords <json>             Coordinates as JSON string

Other Options:
  -g, --groupId <id>          Group ID for the rule
  --expiresIn <seconds>       Expiration time in seconds from now
  -h, --help                  Show this help message

Environment Variables:
  PROSOPO_PROVIDER_MNEMONIC   Provider account mnemonic (required)
  PROSOPO_API_BASE_URL        Provider API base URL (default: http://localhost)
  PROSOPO_API_PORT            Provider API port (default: 9229)

Examples:
  # Block all requests from Russia
  npx tsx scripts/addUserAccessPolicy.ts --type block --countryCode RU

  # Block requests from China for a specific site
  npx tsx scripts/addUserAccessPolicy.ts --type block --countryCode CN --clientId 5FHneW46...

  # Force image captcha for users from a country
  npx tsx scripts/addUserAccessPolicy.ts --type restrict --countryCode IR --captchaType image --solvedImagesCount 5

  # Block an IP address
  npx tsx scripts/addUserAccessPolicy.ts --type block --ip 192.168.1.100

  # Block an IP range
  npx tsx scripts/addUserAccessPolicy.ts --type block --ipMask 192.168.1.0/24

  # Block a specific user from a country
  npx tsx scripts/addUserAccessPolicy.ts --type block --countryCode RU --userId suspicious-user-123

  # Temporary block (expires in 1 hour)
  npx tsx scripts/addUserAccessPolicy.ts --type block --countryCode KP --expiresIn 3600
`);
}

function buildRuleGroup(options: RuleOptions): InsertRulesGroup {
	// Build access policy
	const accessPolicy: InsertRulesGroup["accessPolicy"] = {
		type:
			options.type === "block"
				? AccessPolicyType.Block
				: AccessPolicyType.Restrict,
		...(options.description && { description: options.description }),
		...(options.captchaType && {
			captchaType: CaptchaType[options.captchaType],
		}),
		...(options.solvedImagesCount !== undefined && {
			solvedImagesCount: options.solvedImagesCount,
		}),
		...(options.unsolvedImagesCount !== undefined && {
			unsolvedImagesCount: options.unsolvedImagesCount,
		}),
		...(options.powDifficulty !== undefined && {
			powDifficulty: options.powDifficulty,
		}),
		...(options.imageThreshold !== undefined && {
			imageThreshold: options.imageThreshold,
		}),
		...(options.frictionlessScore !== undefined && {
			frictionlessScore: options.frictionlessScore,
		}),
	};

	// Build user scope
	const userScope: InsertRulesGroup["userScopes"][0] = {
		...(options.countryCode && { countryCode: options.countryCode }),
		...(options.userId && { userId: options.userId }),
		...(options.ip && { ip: options.ip }),
		...(options.ipMask && { ipMask: options.ipMask }),
		...(options.ja4Hash && { ja4Hash: options.ja4Hash }),
		...(options.userAgent && { userAgent: options.userAgent }),
		...(options.headHash && { headHash: options.headHash }),
		...(options.coords && { coords: options.coords }),
	};

	// Build policy scopes
	const policyScopes: InsertRulesGroup["policyScopes"] = options.clientId
		? [{ clientId: options.clientId }]
		: undefined;

	// Calculate expiration timestamp
	const expiresUnixTimestamp = options.expiresIn
		? Math.floor(Date.now() / 1000) + options.expiresIn
		: undefined;

	return {
		accessPolicy,
		userScopes: [userScope],
		...(policyScopes && { policyScopes }),
		...(options.groupId && { groupId: options.groupId }),
		...(expiresUnixTimestamp && { expiresUnixTimestamp }),
	};
}

async function main(): Promise<void> {
	const options = parseArguments();
	const secret = getProviderSecret();
	const providerUrl = getProviderUrl();

	console.log(`Connecting to provider at ${providerUrl}...`);

	// Create keypair and issue JWT
	const pair = getPair(secret);
	const jwt = pair.jwtIssue();

	console.log(`Authenticated as ${pair.address}`);

	// Create API client
	const apiClient = new AccessRulesApiClient(providerUrl, pair.address);

	// Build the rule group
	const ruleGroup = buildRuleGroup(options);

	console.log("\nInserting rule:");
	console.log(JSON.stringify(ruleGroup, null, 2));

	try {
		const response = await apiClient.insertMany([ruleGroup], jwt);

		if (response.status === "success" || response.status === "processing") {
			console.log("\nRule inserted successfully!");
			console.log(`Status: ${response.status}`);
		} else {
			console.error("\nFailed to insert rule:");
			console.error(response);
			process.exit(1);
		}
	} catch (error) {
		console.error("\nError inserting rule:");
		console.error(error);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("Unhandled error:", error);
	process.exit(1);
});
