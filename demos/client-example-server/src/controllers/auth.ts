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

import { blake2b } from "@noble/hashes/blake2b";
import { u8aToHex } from "@polkadot/util";
import { randomAsHex } from "@polkadot/util-crypto";
import { ProsopoEnvError, getLogger } from "@prosopo/common";
import { getPair } from "@prosopo/keyring";
import { ProsopoServer } from "@prosopo/server";
import {
	ApiParams,
	CaptchaType,
	type KeyringPair,
	ProcaptchaResponse,
	type ProcaptchaToken,
	type ProsopoServerConfigOutput,
} from "@prosopo/types";
import { at } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Connection } from "mongoose";
import { z } from "zod";
import type { UserInterface } from "../models/user.js";

const logger = getLogger("info", import.meta.url);

const SubscribeBodySpec = ProcaptchaResponse.merge(
	z.object({
		email: z.string().email(),
		password: z.string(),
		siteKey: z.string(),
	}),
);

function hashPassword(password: string): string {
	return u8aToHex(blake2b(password));
}

const NO_IP = "NO_IP";

/**
 * Derives the correct KeyringPair and secret for a given site key by trying different captcha types.
 * @param baseSecret - The base secret from config
 * @param siteKey - The site key to match against
 * @returns Object containing the matched pair and its corresponding secret
 * @throws Error if no matching pair is found
 */
const getPairAndSecretForSiteKey = (
	baseSecret: string,
	siteKey: string,
): { pair: KeyringPair; secret: string } => {
	let pair: KeyringPair | undefined;
	let secret = baseSecret;

	pair = getPair(secret);

	if (pair.address === siteKey) {
		logger.info(() => ({
			msg: "Site key matches the server configuration without captcha type suffix",
			data: {
				siteKeyDerived: pair?.address,
				siteKey,
			},
		}));
		return { pair, secret };
	}

	for (const captchaType of [
		CaptchaType.pow,
		CaptchaType.image,
		CaptchaType.frictionless,
	]) {
		const newSecret = `${baseSecret}//${captchaType}`;
		pair = getPair(newSecret);
		console.log(
			`[PAIR CHECK] Checking pair for ${captchaType}: ${pair?.address} (expected: ${siteKey})`,
		);
		logger.info(() => ({
			msg: "Checking pair",
			data: {
				captchaType,
				siteKeyDerived: pair?.address,
				siteKey,
			},
		}));
		if (pair.address === siteKey) {
			console.log(`[PAIR CHECK] ✅ Match found for ${captchaType}!`);
			secret = newSecret;
			break;
		}
	}

	if (!pair || pair.address !== siteKey) {
		throw new Error(
			`Site key does not match the server configuration: Provided ${siteKey} vs Server ${pair?.address}`,
		);
	}

	return { pair, secret };
};

const getResponse = async (
	ip: string,
	token: ProcaptchaToken,
	secret: string,
	verifyEndpoint: string,
	email?: string,
) => {
	// Only include ip if environment is production
	const body: Record<string, string> = {
		[ApiParams.token]: token,
		[ApiParams.secret]: secret,
		...(email ? { [ApiParams.email]: email } : {}),
	};

	if (process.env.NODE_ENV !== "development") {
		body[ApiParams.ip] = ip;
	}

	logger.info(() => ({
		data: {
			body,
		},
	}));

	const response = await fetch(verifyEndpoint, {
		method: "POST",
		body: JSON.stringify(body),
	});
	return response.json();
};

const verify = async (
	prosopoServer: ProsopoServer,
	verifyType: string,
	verifyEndpoint: string,
	token: ProcaptchaToken,
	secret: string,
	ip: string,
	email?: string,
) => {
	if (verifyType === "api") {
		// verify using the API endpoint
		logger.info(() => ({
			msg: "Verifying using the API endpoint",
			data: {
				verifyEndpoint,
			},
		}));

		const response = await getResponse(
			ip,
			token,
			secret,
			verifyEndpoint,
			email,
		);
		logger.info(() => ({
			data: {
				response,
			},
		}));
		return response.verified;
	}
	// verify using the TypeScript library
	const verified = await prosopoServer.isVerified(token, ip, email);
	logger.info(() => ({
		data: {
			verified,
		},
	}));
	return verified[ApiParams.verified];
};

const signup = async (
	mongoose: Connection,
	config: ProsopoServerConfigOutput,
	verifyEndpoint: string,
	verifyType: string,
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!config.account.secret) {
			throw new ProsopoEnvError("GENERAL.MNEMONIC_UNDEFINED", {
				context: { missingParams: ["PROSOPO_SITE_PRIVATE_KEY"] },
			});
		}
		const User = mongoose.model<UserInterface>("User");
		// checks if email exists
		const dbUser = await User.findOne({
			email: { $eq: req.body.email },
		});
		const payload = SubscribeBodySpec.parse(req.body);
		// get the procaptcha-response token
		const token = payload[ApiParams.procaptchaResponse];
		const siteKey = payload[ApiParams.siteKey];

		const { pair, secret } = getPairAndSecretForSiteKey(
			config.account.secret,
			siteKey,
		);

		const prosopoServer = new ProsopoServer(config, pair);
		if (dbUser) {
			return res.status(409).json({ message: "email already exists" });
		}

		const email = req.body.email;
		const verified = await verify(
			prosopoServer,
			verifyType,
			verifyEndpoint,
			token,
			secret,
			req.headers["x-client-ip"]?.toString() || "127.0.0.1",
			email,
		);

		if (verified === true) {
			// salt
			const salt = randomAsHex(32);
			// !!!DUMMY CODE!!! - Do not use in production. Use bcrypt or similar for password hashing.
			const passwordHash = hashPassword(`${req.body.password}${salt}`);
			if (passwordHash) {
				return User.create({
					email: email,
					name: req.body.name,
					password: passwordHash,
					salt: salt,
				})
					.then(() => {
						res.status(200).json({ message: "user created" });
					})
					.catch((err) => {
						logger.error(() => ({
							err,
							msg: "Error creating user in database",
						}));
						res.status(502).json({ message: "error while creating the user" });
					});
			}
		} else {
			res
				.status(401)
				.json({ message: "user has not completed a captcha", verified });
		}
	} catch (err) {
		console.error("error", err);
		res
			.status(500)
			.json({ message: (err as Error).message || "internal server error" });
	}
};

const login = async (
	mongoose: Connection,
	config: ProsopoServerConfigOutput,
	verifyEndpoint: string,
	verifyType: string,
	req: Request,
	res: Response,
) => {
	const User = mongoose.model<UserInterface>("User");

	// checks if email exists
	await User.findOne({
		email: { $eq: req.body.email },
	})
		.then(async (dbUser) => {
			if (dbUser) {
				const payload = SubscribeBodySpec.parse(req.body);

				const token = payload[ApiParams.procaptchaResponse];
				const siteKey = payload[ApiParams.siteKey];

				if (!config.account.secret) {
					throw new ProsopoEnvError("GENERAL.SECRET_MISSING", {
						context: { missingParams: ["PROSOPO_SITE_PRIVATE_KEY"] },
					});
				}

				const { pair, secret } = getPairAndSecretForSiteKey(
					config.account.secret,
					siteKey,
				);
				const prosopoServer = new ProsopoServer(config, pair);

				const verified = await verify(
					prosopoServer,
					verifyType,
					verifyEndpoint,
					token,
					secret,
					req.headers["x-client-ip"]?.toString() || NO_IP,
				);

				logger.info(() => ({
					data: {
						verified,
					},
				}));

				if (verified) {
					// password hash
					// !!!DUMMY CODE!!! - Do not use in production. Use bcrypt or similar for password hashing.
					const passwordHash = hashPassword(
						`${req.body.password}${dbUser.salt}`,
					);
					if (passwordHash !== dbUser.password) {
						// password doesnt match
						return res.status(401).json({ message: "invalid credentials" });
					}
					// password match
					const token = jwt.sign({ email: req.body.email }, "secret", {
						expiresIn: "1h",
					});
					return res
						.status(200)
						.json({ message: "user logged in", token: token });
				}
				return res
					.status(401)
					.json({ message: "user has not completed a captcha", verified });
			}
			return res.status(404).json({ message: "user not found" });
		})
		.catch((err) => {
			console.error("error", err);
			res.status(500).json({ message: err.message || "internal server error" });
		});
};

const isAuth = (req: Request, res: Response) => {
	const authHeader = req.get("Authorization") || "";
	if (!authHeader) {
		res.status(401).json({ message: "not authenticated" });
	}

	const token = at(authHeader.split(" "), 1);
	let decodedToken: string | JwtPayload = "";
	try {
		decodedToken = jwt.verify(token, "secret");
	} catch (err) {
		res.status(500).json({
			message: (err as Error).message || "could not decode the token",
		});
	}

	if (!decodedToken) {
		res.status(401).json({ message: "unauthorized" });
	} else {
		res.status(200).json({ message: "here is your resource" });
	}
};

export { signup, login, isAuth };
