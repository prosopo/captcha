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
import type { KeyringPair } from "@polkadot/keyring/types";
import { stringToHex, u8aToHex } from "@polkadot/util";
import {
	ProsopoApiError,
	ProsopoEnvError,
	getLoggerDefault,
} from "@prosopo/common";
import type { Logger } from "@prosopo/common";
import {
	ApiParams,
	type CaptchaResult,
	CaptchaStatus,
	type GetSliderCaptchaResponse,
	type IPAddress,
	type MouseMovement,
	type RequestHeaders,
} from "@prosopo/types";
import type { IProviderDatabase, SliderCaptchaStored } from "@prosopo/types-database";
import { verifyRecency } from "@prosopo/util";
import { CaptchaManager } from "../captchaManager.js";
import { computeFrictionlessScore } from "../frictionless/frictionlessTasksUtils.js";
import { randomUUID } from "crypto";

// Tolerance in pixels for slider positioning
const SLIDER_POSITION_TOLERANCE = 50;

// The minimum variance in Y-axis mouse movements for human detection
const MOUSE_MOVEMENT_Y_VARIANCE_THRESHOLD = 2;

// Minimum required mouse movements for verification
const MIN_MOUSE_MOVEMENTS = 3;

// The minimum time (in ms) a human should spend solving a slider captcha
const MIN_SOLVE_TIME = 500;

// Helper function to get random image URL
const getRandomImageUrl = () => {
	// Use a more reliable CORS-friendly image service
	const width = 320;
	const height = 160;
	const imageId = Math.floor(Math.random() * 1000) + 1;
	
	// Use picsum.photos which typically has proper CORS headers
	return `https://picsum.photos/id/${imageId}/${width}/${height}`;
};

export class SliderCaptchaManager extends CaptchaManager {
	constructor(db: IProviderDatabase, pair: KeyringPair, logger?: Logger) {
		super(db, pair, logger || getLoggerDefault());
	}

	/**
	 * Helper method to safely convert an IP address to bigint
	 * @param ipAddress IP address object
	 * @returns bigint representation of the IP address
	 */
	private convertIpAddressToBigInt(ipAddress: IPAddress): bigint {
		try {
			// Handle both IPv4 and IPv6 addresses
			if (ipAddress.address) {
				// Use a safe fallback value if conversion fails
				const ipValue = ipAddress.address.replace(/[^0-9]/g, "");
				return ipValue ? BigInt(ipValue.substring(0, 16)) : BigInt(0);
			}
		} catch (error) {
			this.logger.warn("IP address conversion failed, using 0", { 
				address: ipAddress.address,
				error 
			});
		}
		return BigInt(0);
	}

	/**
	 * Generates a Slider Captcha for a given user and dapp
	 *
	 * @param {string} userAccount - user that is solving the captcha
	 * @param {string} dappAccount - dapp that is requesting the captcha
	 * @param {RequestHeaders} headers - request headers
	 * @param {IPAddress} ipAddress - IP address
	 * @param {string} ja4 - browser fingerprint
	 * @param {string} sessionId - optional session ID for frictionless flow
	 */
	async getSliderCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		headers: RequestHeaders,
		ipAddress: IPAddress,
		ja4: string,
		sessionId?: string,
	): Promise<GetSliderCaptchaResponse> {
		const requestedAtTimestamp = Date.now();
		
		// Generate a unique ID for this challenge
		const id = randomUUID();
		
		// Generate a random target position
		const targetPosition = Math.floor(Math.random() * 280) + 20; // Between 20-300
		
		// Generate a random image URL
		const imageUrl = getRandomImageUrl();
		
		// Generate a challenge signature
		const challengeString = `${id}-${userAccount}-${dappAccount}-${targetPosition}`;
		const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challengeString)));
		
		// Create a response object
		const response: GetSliderCaptchaResponse = {
			status: "ok",
			imageUrl,
			targetPosition,
			timestamp: requestedAtTimestamp.toString(),
			challengeId: id,
			signature: {
				provider: {
					challenge: challengeSignature,
				},
			},
		};
		
		// Store the challenge in the database
		// Convert ipAddress to bigint as required by the schema
		const ipAddressBigInt = this.convertIpAddressToBigInt(ipAddress);
		
		const sliderCaptcha: SliderCaptchaStored = {
			id,
			dappAccount,
			userAccount,
			targetPosition,
			imageUrl,
			requestedAtTimestamp,
			ipAddress: ipAddressBigInt,
			headers,
			ja4,
			result: { status: CaptchaStatus.pending },
			userSubmitted: false,
			serverChecked: false,
		};
		
		try {
			// Let's check if we need to attach this to a frictionless token
			let frictionlessTokenId;
			if (sessionId) {
				const session = await this.db.getSessionRecordBySessionId(sessionId);
				if (session && session.tokenId) {
					frictionlessTokenId = session.tokenId;
					sliderCaptcha.frictionlessTokenId = frictionlessTokenId;
				}
			}
			
			// Store the new slider captcha record
			await this.db.storeSliderCaptchaRecord(sliderCaptcha);
			this.logger.info("Slider captcha challenge created", {
				id,
				userAccount,
				dappAccount,
				hasFrictionlessToken: !!frictionlessTokenId,
			});
			
			return response;
		} catch (error) {
			this.logger.error("Failed to create slider captcha challenge", {
				error,
				userAccount,
				dappAccount,
			});
			throw error;
		}
	}
	
	/**
	 * Verifies a Slider Captcha solution
	 *
	 * @param {string} challengeId - ID of the challenge
	 * @param {number} position - User's slider position
	 * @param {MouseMovement[]} mouseMovements - Recorded mouse movements
	 * @param {number} solveTime - Time taken to solve
	 * @param {string} userSignature - User's signature for verification
	 * @param {IPAddress} ipAddress - IP address
	 * @param {RequestHeaders} headers - Request headers
	 */
	async verifySliderCaptchaSolution(
		challengeId: string,
		position: number,
		mouseMovements: MouseMovement[],
		solveTime: number,
		userSignature: string,
		ipAddress: IPAddress,
		headers: RequestHeaders,
	): Promise<boolean> {
		// Get the challenge record
		const challengeRecord = await this.db.getSliderCaptchaRecordById(challengeId);
		
		if (!challengeRecord) {
			this.logger.info("No record of this slider challenge", { challengeId });
			return false;
		}
		
		// Convert IP address to bigint safely to add to logs
		const ipAddressBigInt = this.convertIpAddressToBigInt(ipAddress);
		
		// Verify challenge is recent (within 2 minutes)
		const challengeTime = challengeRecord.requestedAtTimestamp;
		const currentTime = Date.now();
		if (currentTime - challengeTime > 2 * 60 * 1000) {
			await this.db.updateSliderCaptchaRecord(
				challengeId,
				{
					status: CaptchaStatus.disapproved,
					reason: "CAPTCHA.INVALID_TIMESTAMP",
				},
				false, // serverChecked
				true, // userSubmitted
				position,
				solveTime,
				userSignature,
			);
			return false;
		}
		
		// Check if solved too quickly (potential bot)
		// if (solveTime < MIN_SOLVE_TIME) {
		// 	this.logger.info("Slider solved too quickly", {
		// 		challengeId,
		// 		solveTime,
		// 		minRequiredTime: MIN_SOLVE_TIME,
		// 	});
		// 	await this.db.updateSliderCaptchaRecord(
		// 		challengeId,
		// 		{
		// 			status: CaptchaStatus.disapproved,
		// 			reason: "CAPTCHA.TOO_FAST",
		// 		},
		// 		false,
		// 		true,
		// 		position,
		// 		solveTime,
		// 		userSignature,
		// 	);
		// 	return false;
		// }
		
		// Check if position is close enough to target
		const targetPosition = challengeRecord.targetPosition;
		const positionDifference = Math.abs(position - targetPosition);
		const isPositionCorrect = positionDifference <= SLIDER_POSITION_TOLERANCE;
		
		if (!isPositionCorrect) {
			this.logger.info("Slider position not correct", {
				challengeId,
				position,
				targetPosition,
				positionDifference,
				tolerance: SLIDER_POSITION_TOLERANCE,
			});
			await this.db.updateSliderCaptchaRecord(
				challengeId,
				{
					status: CaptchaStatus.disapproved,
					reason: "CAPTCHA.INVALID_SOLUTION",
				},
				false,
				true,
				position,
				solveTime,
				userSignature,
			);
			return false;
		}
		
		// Check mouse movement variability (anti-bot measure) - more lenient now
		let hasMouseVariance = true; // Default to true for leniency
		
		if (mouseMovements.length >= MIN_MOUSE_MOVEMENTS) {
			// Calculate variance in Y positions (natural human movement has variance)
			const yPositions = mouseMovements.map((m) => m.y);
			const yAvg = yPositions.reduce((a, b) => a + b, 0) / yPositions.length;
			const yVariance = yPositions.reduce((a, b) => a + Math.pow(b - yAvg, 2), 0) / yPositions.length;
			
			this.logger.info("Mouse movement analysis", {
				challengeId,
				yVariance,
				threshold: MOUSE_MOVEMENT_Y_VARIANCE_THRESHOLD,
				movements: mouseMovements.length,
			});
			
			// Only mark as suspicious if there's almost no variance at all (likely a bot)
			if (yVariance < 0.5) {
				hasMouseVariance = false;
			}
		}
		
		// Only reject if extremely suspicious (no variance at all)
		if (!hasMouseVariance) {
			this.logger.info("Extremely suspicious mouse movement pattern", {
				challengeId,
				movements: mouseMovements.length,
			});
			await this.db.updateSliderCaptchaRecord(
				challengeId,
				{
					status: CaptchaStatus.disapproved,
					reason: "CAPTCHA.SUSPICIOUS_BEHAVIOR",
				},
				false,
				true,
				position,
				solveTime,
				userSignature,
			);
			return false;
		}
		
		// All checks passed, approve the solution
		await this.db.updateSliderCaptchaRecord(
			challengeId,
			{ status: CaptchaStatus.approved },
			false,
			true,
			position,
			solveTime,
			userSignature,
		);
		
		return true;
	}
	
	/**
	 * Server verification of a slider captcha solution (called when dapp verifies the token)
	 * 
	 * @param {string} dappAccount - Dapp account address
	 * @param {string} challengeId - ID of the challenge
	 * @param {number} timeout - Verification timeout
	 */
	async serverVerifySliderCaptchaSolution(
		dappAccount: string,
		challengeId: string,
		timeout: number, // This parameter is now ignored as we calculate timeout from record creation
	): Promise<{ verified: boolean; score?: number }> {
		const challengeRecord = await this.db.getSliderCaptchaRecordById(challengeId);
		
		if (!challengeRecord) {
			this.logger.debug(`No record of this slider challenge: ${challengeId}`);
			return { verified: false };
		}
		
		if (challengeRecord.result.status !== CaptchaStatus.approved) {
			throw new ProsopoApiError("CAPTCHA.INVALID_SOLUTION", {
				context: {
					failedFuncName: this.serverVerifySliderCaptchaSolution.name,
					challengeId,
				},
			});
		}
		
		if (challengeRecord.serverChecked) {
			return { verified: false };
		}
		
		const challengeDappAccount = challengeRecord.dappAccount;
		
		if (dappAccount !== challengeDappAccount) {
			throw new ProsopoEnvError("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", {
				context: {
					failedFuncName: this.serverVerifySliderCaptchaSolution.name,
					dappAccount,
					challengeDappAccount,
				},
			});
		}
		
		// Calculate timeout based on record creation date (10 minutes from creation)
		const VERIFICATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
		const challengeTime = challengeRecord.requestedAtTimestamp;
		if (Date.now() - challengeTime > VERIFICATION_TIMEOUT) {
			this.logger.info("Slider captcha verification timeout", {
				challengeId,
				creationTime: challengeTime,
				currentTime: Date.now(),
				timeout: VERIFICATION_TIMEOUT
			});
			return { verified: false };
		}
		
		// Mark the challenge as server-checked
		await this.db.markSliderCaptchaChecked(challengeId);
		
		// Check if there's a frictionless score
		let score: number | undefined;
		if (challengeRecord.frictionlessTokenId) {
			const tokenRecord = await this.db.getFrictionlessTokenRecordByTokenId(
				challengeRecord.frictionlessTokenId,
			);
			if (tokenRecord) {
				score = computeFrictionlessScore(tokenRecord?.scoreComponents);
				this.logger.info({
					scoreComponents: tokenRecord?.scoreComponents,
					score: score,
				});
			}
		}
		
		return { verified: true, ...(score ? { score } : {}) };
	}
} 