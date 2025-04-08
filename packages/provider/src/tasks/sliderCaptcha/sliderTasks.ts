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
	type DatasetBase,
	type GetSliderCaptchaResponse,
	type IPAddress,
	type MouseMovement,
	type RequestHeaders,
	type SliderCaptcha,
	type SliderCaptchaItem,
	type SliderCaptchaWithoutId,
} from "@prosopo/types";
import type { IProviderDatabase, SliderCaptchaStored } from "@prosopo/types-database";
import { verifyRecency } from "@prosopo/util";
import { CaptchaManager } from "../captchaManager.js";
import { computeFrictionlessScore } from "../frictionless/frictionlessTasksUtils.js";
import { randomUUID } from "crypto";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

// Tolerance in pixels for slider positioning
const SLIDER_POSITION_TOLERANCE = 50;

// The minimum variance in Y-axis mouse movements for human detection
const MOUSE_MOVEMENT_Y_VARIANCE_THRESHOLD = 2;

// Minimum required mouse movements for verification
const MIN_MOUSE_MOVEMENTS = 3;

// The minimum time (in ms) a human should spend solving a slider captcha
const MIN_SOLVE_TIME = 500;

// Extend SliderCaptchaItem to support shape property
interface ShapedSliderCaptchaItem extends SliderCaptchaItem {
    shape?: string;
}

// Extend SliderCaptchaWithoutId to use ShapedSliderCaptchaItem
interface ShapedSliderCaptchaWithoutId extends Omit<SliderCaptchaWithoutId, 'puzzlePiece'> {
    puzzlePiece: ShapedSliderCaptchaItem;
}

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
	private datasetPath?: string;
	private assetPath?: string;
	private availableDatasets: string[] = [];
	private hasDatabaseDatasets: boolean = false;
	private hasFilesystemDatasets: boolean = false;
	
	constructor(
		db: IProviderDatabase, 
		pair: KeyringPair, 
		logger?: Logger, 
		options?: { 
			datasetPath?: string; 
			assetPath?: string;
		}
	) {
		super(db, pair, logger || getLoggerDefault());
		this.datasetPath = options?.datasetPath;
		this.assetPath = options?.assetPath;
		
		// Check for shaped datasets in the database
		this.checkForDatabaseDatasets();
		
		// Also check for datasets in the filesystem as fallback
		this.checkForFilesystemDatasets();
		
		// Log detailed information about dataset availability
		this.logDatasetAvailability();
	}
	
	/**
	 * Check if slider captcha datasets exist in the database
	 * This is done asynchronously so it won't block construction
	 */
	private checkForDatabaseDatasets(): void {
		// This will be done asynchronously to avoid blocking construction
		this.db.getDatasetByType('slider')
			.then((datasets: DatasetBase[] | undefined) => {
				this.hasDatabaseDatasets = Boolean(datasets && datasets.length > 0);
				if (this.hasDatabaseDatasets && datasets) {
					this.logger.info(`Found ${datasets.length} slider captcha datasets in database`);
				} else {
					this.logger.info('No slider captcha datasets found in database');
				}
				// Re-log availability after async check completes
				this.logDatasetAvailability();
			})
			.catch((error: Error) => {
				this.logger.warn('Failed to check for slider captcha datasets in database', { error });
				this.hasDatabaseDatasets = false;
			});
	}
	
	/**
	 * Check if slider captcha datasets exist in the filesystem
	 */
	private checkForFilesystemDatasets(): void {
		if (this.datasetPath && existsSync(this.datasetPath)) {
			try {
				// Get all directories in the dataset path
				const directories = readdirSync(this.datasetPath, { withFileTypes: true })
					.filter(dirent => dirent.isDirectory())
					.map(dirent => dirent.name);
				
				// Find all dataset.json files in subdirectories
				this.availableDatasets = [];
				for (const dir of directories) {
					const datasetFilePath = join(this.datasetPath, dir, 'dataset.json');
					if (existsSync(datasetFilePath)) {
						this.availableDatasets.push(join(dir, 'dataset.json'));
					}
				}
				
				this.hasFilesystemDatasets = this.availableDatasets.length > 0;
				this.logger.info(`Found ${this.availableDatasets.length} slider captcha datasets in filesystem at ${this.datasetPath}`);
			} catch (error) {
				this.logger.warn(`Failed to read datasets from ${this.datasetPath}`, { error });
				this.availableDatasets = [];
				this.hasFilesystemDatasets = false;
			}
		} else {
			if (this.datasetPath) {
				this.logger.info(`No slider captcha datasets directory found at ${this.datasetPath}`);
			} else {
				this.logger.info('No slider captcha datasets directory path provided');
			}
			this.hasFilesystemDatasets = false;
		}
	}
	
	/**
	 * Log detailed information about dataset availability
	 */
	private logDatasetAvailability(): void {
		this.logger.info('Slider captcha dataset availability:', {
			hasDatabaseDatasets: this.hasDatabaseDatasets,
			hasFilesystemDatasets: this.hasFilesystemDatasets,
			canUseShapedCaptchas: this.canUseShapedCaptchas(),
			datasetPath: this.datasetPath,
			availableDatasetsCount: this.availableDatasets.length
		});
	}
	
	/**
	 * Check if we can use shaped captchas
	 * @returns true if shaped captchas can be used
	 */
	private canUseShapedCaptchas(): boolean {
		return this.hasDatabaseDatasets || this.hasFilesystemDatasets;
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
		
		// Check if we should use shaped captchas
		if (this.canUseShapedCaptchas()) {
			// Log which dataset source we're using
			if (this.hasDatabaseDatasets) {
				this.logger.info('Using shaped slider captchas from database');
			} else {
				this.logger.info('Using shaped slider captchas from filesystem');
			}
			
			return this.getShapedSliderCaptcha(
				id,
				userAccount,
				dappAccount,
				headers,
				ipAddress,
				ja4,
				requestedAtTimestamp,
				sessionId
			);
		} else {
			// Use traditional simple slider captcha
			this.logger.info('No shaped slider captchas available, using simple slider captcha');
			return this.getSimpleSliderCaptcha(
				id,
				userAccount,
				dappAccount,
				headers,
				ipAddress,
				ja4,
				requestedAtTimestamp,
				sessionId
			);
		}
	}
	
	/**
	 * Get a pre-generated shaped slider captcha from a dataset
	 */
	private async getShapedSliderCaptcha(
		id: string,
		userAccount: string,
		dappAccount: string,
		headers: RequestHeaders,
		ipAddress: IPAddress,
		ja4: string,
		requestedAtTimestamp: number,
		sessionId?: string,
	): Promise<GetSliderCaptchaResponse> {
		try {
			// First try to get a captcha from the database
			if (this.hasDatabaseDatasets) {
				try {
					// Get a random dataset from the database
					const datasets = await this.db.getDatasetByType('slider');
					if (datasets && datasets.length > 0) {
						const randomDatasetIndex = Math.floor(Math.random() * datasets.length);
						const dataset = datasets[randomDatasetIndex];
						
						this.logger.info('Using shaped slider captcha from database', {
							datasetId: dataset.datasetId,
							captchaCount: dataset.captchas.length
						});
						
						// Get a random captcha from the dataset
						const captchaIndex = Math.floor(Math.random() * dataset.captchas.length);
						const captcha = dataset.captchas[captchaIndex] as ShapedSliderCaptchaWithoutId;
						
						// Create base URLs for the assets
						const assetBaseUrl = this.assetPath || `/datasets/${dataset.datasetId}/assets`;
						
						// Get the target position from the puzzle piece
						const targetPosition = captcha.puzzlePiece.position;
						
						if (!targetPosition) {
							throw new Error('Captcha puzzle piece has no position');
						}
						
						// Generate a challenge signature
						const challengeString = `${id}-${userAccount}-${dappAccount}-${JSON.stringify(targetPosition)}`;
						const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challengeString)));
						
						// Create the response object
						const response: GetSliderCaptchaResponse = {
							status: "ok",
							baseImageUrl: `${assetBaseUrl}/${captcha.baseImage.data}`,
							puzzlePieceUrl: `${assetBaseUrl}/${captcha.puzzlePiece.data}`,
							targetPosition: targetPosition,
							timestamp: requestedAtTimestamp.toString(),
							challengeId: id,
							signature: {
								provider: {
									challenge: challengeSignature,
								},
							},
							// Add the shape as a custom property (compatible with original interface)
							shape: captcha.puzzlePiece.shape,
						};
						
						// Store the challenge in the database
						// Convert ipAddress to bigint as required by the schema
						const ipAddressBigInt = this.convertIpAddressToBigInt(ipAddress);
						
						const sliderCaptcha: SliderCaptchaStored = {
							id,
							dappAccount,
							userAccount,
							targetPosition,
							baseImageUrl: response.baseImageUrl,
							puzzlePieceUrl: response.puzzlePieceUrl,
							shape: response.shape,
							datasetId: dataset.datasetId,
							requestedAtTimestamp,
							ipAddress: ipAddressBigInt,
							headers,
							ja4,
							result: { status: CaptchaStatus.pending },
							userSubmitted: false,
							serverChecked: false,
						};
						
						// Check if we need to attach this to a frictionless token
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
						this.logger.info("Shaped slider captcha challenge created from database", {
							id,
							userAccount,
							dappAccount,
							datasetId: dataset.datasetId,
							shape: response.shape,
							hasFrictionlessToken: !!frictionlessTokenId,
						});
						
						return response;
					}
				} catch (dbError) {
					this.logger.warn("Error getting shaped slider captcha from database, falling back to filesystem", {
						error: dbError
					});
					// Fall through to filesystem approach
				}
			}
			
			// Fallback to filesystem datasets if available
			if (this.availableDatasets.length === 0 || !this.datasetPath) {
				throw new Error('No slider captcha datasets available');
			}
			
			const datasetIndex = Math.floor(Math.random() * this.availableDatasets.length);
			const datasetFile = this.availableDatasets[datasetIndex];
			
			if (!datasetFile) {
				throw new Error('Failed to select a dataset file');
			}
			
			const datasetPath = join(this.datasetPath, datasetFile);
			
			// Load the dataset
			const datasetContent = readFileSync(datasetPath, 'utf8');
			const dataset = JSON.parse(datasetContent);
			
			this.logger.info('Using shaped slider captcha from filesystem', {
				datasetPath,
				captchaCount: dataset.captchas.length
			});
			
			// Get a random captcha from the dataset
			const captchaIndex = Math.floor(Math.random() * dataset.captchas.length);
			const captcha = dataset.captchas[captchaIndex] as ShapedSliderCaptchaWithoutId;
			
			// Create base URLs for the assets - this assumes the asset files are in the same directory
			// as the dataset file but in an 'assets' subdirectory
			const datasetDir = datasetFile.substring(0, datasetFile.lastIndexOf('/'));
			const assetBaseUrl = this.assetPath ? `${this.assetPath}/${datasetDir}/assets` : `/datasets/${datasetDir}/assets`;
			
			// Get the target position from the puzzle piece
			const targetPosition = captcha.puzzlePiece.position;
			
			if (!targetPosition) {
				throw new Error('Captcha puzzle piece has no position');
			}
			
			// Generate a challenge signature
			const challengeString = `${id}-${userAccount}-${dappAccount}-${JSON.stringify(targetPosition)}`;
			const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challengeString)));
			
			// Create the response object
			const response: GetSliderCaptchaResponse = {
				status: "ok",
				baseImageUrl: `${assetBaseUrl}/${captcha.baseImage.data}`,
				puzzlePieceUrl: `${assetBaseUrl}/${captcha.puzzlePiece.data}`,
				targetPosition: targetPosition,
				timestamp: requestedAtTimestamp.toString(),
				challengeId: id,
				signature: {
					provider: {
						challenge: challengeSignature,
					},
				},
				// Add the shape as a custom property (compatible with original interface)
				shape: captcha.puzzlePiece.shape,
			};
			
			// Store the challenge in the database
			// Convert ipAddress to bigint as required by the schema
			const ipAddressBigInt = this.convertIpAddressToBigInt(ipAddress);
			
			const sliderCaptcha: SliderCaptchaStored = {
				id,
				dappAccount,
				userAccount,
				targetPosition,
				baseImageUrl: response.baseImageUrl,
				puzzlePieceUrl: response.puzzlePieceUrl,
				shape: response.shape,
				datasetId: dataset.datasetId,
				requestedAtTimestamp,
				ipAddress: ipAddressBigInt,
				headers,
				ja4,
				result: { status: CaptchaStatus.pending },
				userSubmitted: false,
				serverChecked: false,
			};
			
			// Check if we need to attach this to a frictionless token
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
			this.logger.info("Shaped slider captcha challenge created from filesystem", {
				id,
				userAccount,
				dappAccount,
				datasetId: dataset.datasetId,
				shape: response.shape,
				hasFrictionlessToken: !!frictionlessTokenId,
			});
			
			return response;
		} catch (error) {
			this.logger.error("Error creating shaped slider captcha challenge, falling back to simple slider", { 
				error 
			});
			// Fallback to simple slider captcha
			return this.getSimpleSliderCaptcha(
				id,
				userAccount,
				dappAccount,
				headers,
				ipAddress,
				ja4,
				requestedAtTimestamp,
				sessionId
			);
		}
	}
	
	/**
	 * Get a simple slider captcha with a random image
	 */
	private async getSimpleSliderCaptcha(
		id: string,
		userAccount: string,
		dappAccount: string,
		headers: RequestHeaders,
		ipAddress: IPAddress,
		ja4: string,
		requestedAtTimestamp: number,
		sessionId?: string,
	): Promise<GetSliderCaptchaResponse> {
		// Generate a random target position
		const targetPositionX = Math.floor(Math.random() * 280) + 20; // Between 20-300
		
		// Generate a random image URL
		const imageUrl = getRandomImageUrl();
		
		// Generate a challenge signature
		const challengeString = `${id}-${userAccount}-${dappAccount}-${targetPositionX}`;
		const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challengeString)));
		
		// Create a response object
		const response: GetSliderCaptchaResponse = {
			status: "ok",
			baseImageUrl: imageUrl, // Use imageUrl as baseImageUrl for compatibility
			puzzlePieceUrl: imageUrl, // Use the same image as a placeholder
			targetPosition: {
				x: targetPositionX,
				y: 0 // Simple slider only uses x-axis
			},
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
			targetPosition: targetPositionX, // Store as simple number for backward compatibility
			imageUrl, // Keep imageUrl for backward compatibility
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
			this.logger.info("Simple slider captcha challenge created", {
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
		
		// Check if position is close enough to target
		let isPositionCorrect = false;
		
		// Check if we have a 2D position or a simple position
		if (typeof challengeRecord.targetPosition === 'number') {
			// Simple slider
			const targetPosition = challengeRecord.targetPosition as number;
			const positionDifference = Math.abs(position - targetPosition);
			isPositionCorrect = positionDifference <= SLIDER_POSITION_TOLERANCE;
			
			this.logger.info("Verifying simple slider position", {
				challengeId,
				position,
				targetPosition,
				positionDifference,
				tolerance: SLIDER_POSITION_TOLERANCE,
				isPositionCorrect,
			});
		} else {
			// 2D position for shaped slider
			const targetPosition = challengeRecord.targetPosition as { x: number; y: number };
			// For shaped slider, we only care about horizontal position
			const positionDifference = Math.abs(position - targetPosition.x);
			isPositionCorrect = positionDifference <= SLIDER_POSITION_TOLERANCE;
			
			this.logger.info("Verifying shaped slider position", {
				challengeId,
				position,
				targetPositionX: targetPosition.x,
				targetPositionY: targetPosition.y,
				positionDifference,
				tolerance: SLIDER_POSITION_TOLERANCE,
				isPositionCorrect,
			});
		}
		
		if (!isPositionCorrect) {
			this.logger.info("Slider position not correct", {
				challengeId,
				position,
				targetPosition: challengeRecord.targetPosition,
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

	/**
	 * Load a slider captcha dataset from a JSON file into the database
	 * This allows users to load slider captcha datasets using the same CLI approach as image captchas
	 * 
	 * @param datasetJson The parsed JSON data of the slider captcha dataset
	 * @returns Promise that resolves when the dataset is stored
	 */
	async loadDatasetFromJson(datasetJson: any): Promise<void> {
		try {
			// Validate the dataset structure
			if (!datasetJson.datasetId || !datasetJson.captchas || !Array.isArray(datasetJson.captchas)) {
				throw new Error('Invalid slider captcha dataset format');
			}
			
			// Add dataset type field 
			const dataset = {
				...datasetJson,
				datasetType: 'slider',
			};
			
			// Store the dataset in the database
			await this.db.storeDataset(dataset);
			
			this.logger.info(`Successfully stored slider captcha dataset in database`, {
				datasetId: dataset.datasetId,
				captchaCount: dataset.captchas.length
			});
			
			// Update our flag to indicate we have database datasets
			this.hasDatabaseDatasets = true;
			
			// Re-log dataset availability
			this.logDatasetAvailability();
		} catch (error) {
			this.logger.error('Failed to store slider captcha dataset', { error });
			throw error;
		}
	}
} 