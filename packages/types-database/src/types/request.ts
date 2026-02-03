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

import { TranslationKeysSchema } from "@prosopo/locale";
import {
	type CaptchaResult,
	CaptchaStatus,
	type CaptchaType,
	type RequestHeaders,
} from "@prosopo/types";
import type mongoose from "mongoose";
import { Schema } from "mongoose";
import {
	type CompositeIpAddress,
	CompositeIpAddressRecordSchemaObj,
	type ScoreComponents,
} from "./provider.js";

// One week TTL for request records
const ONE_WEEK = 60 * 60 * 24 * 7;

/**
 * Request types for the unified requests collection
 */
export enum RequestType {
	session = "session",
	powcaptcha = "powcaptcha",
	imagecaptcha = "imagecaptcha",
}

/**
 * Common fields shared by all request types
 */
export interface BaseRequest {
	/** Unique sequential request ID */
	requestId: number;
	/** Type discriminator for the request */
	requestType: RequestType;
	/** Session ID linking all requests in a user journey */
	sessionId: string;
	/** Previous request ID for chain tracking */
	previousRequestId?: number;
	/** When this request was created */
	createdAt: Date;
	/** Last update timestamp */
	lastUpdatedTimestamp?: Date;
	/** When this was stored to external DB */
	storedAtTimestamp?: Date;
	/** IP address of the requester */
	ipAddress: CompositeIpAddress;
	/** Site key / dapp account */
	siteKey?: string;
}

/**
 * Session-specific data embedded in SessionRequest
 */
export interface SessionData {
	token: string;
	score: number;
	threshold: number;
	scoreComponents: ScoreComponents;
	providerSelectEntropy: number;
	captchaType: CaptchaType;
	solvedImagesCount?: number;
	powDifficulty?: number;
	deleted?: boolean;
	userSitekeyIpHash?: string;
	webView: boolean;
	iFrame: boolean;
	decryptedHeadHash: string;
	reason?: string;
	blocked?: boolean;
}

/**
 * PoW captcha specific data
 */
export interface PoWCaptchaData {
	challenge: string;
	userAccount: string;
	dappAccount: string;
	result: CaptchaResult;
	ja4?: string;
	providedIp?: CompositeIpAddress;
	geolocation?: string;
	vpn?: boolean;
}

/**
 * Image captcha specific data
 */
export interface ImageCaptchaData {
	/** Commitment ID (generated after solution) */
	commitmentId?: string;
	/** Request hash (used during pending phase) */
	requestHash?: string;
	userAccount: string;
	dappAccount: string;
	providerAccount?: string;
	datasetId?: string;
	result: CaptchaResult;
	userSignature?: string;
	ja4?: string;
	providedIp?: CompositeIpAddress;
	geolocation?: string;
	vpn?: boolean;
	/** Pending challenge fields */
	pending?: boolean;
	salt?: string;
	deadlineTimestamp?: Date;
	threshold?: number;
	/** User submission tracking */
	userSubmitted?: boolean;
	serverChecked?: boolean;
}

/**
 * Session request - first request in a user journey, stores full headers
 */
export interface SessionRequest extends BaseRequest {
	requestType: RequestType.session;
	sessionData: SessionData;
	/** Full headers stored on session request */
	headers: RequestHeaders;
}

/**
 * PoW captcha request - stores header delta from session
 */
export interface PoWCaptchaRequest extends BaseRequest {
	requestType: RequestType.powcaptcha;
	powCaptchaData: PoWCaptchaData;
	/** Delta from session headers (only changed/added headers) */
	headersDelta?: Partial<RequestHeaders>;
}

/**
 * Image captcha request - stores header delta from session
 */
export interface ImageCaptchaRequest extends BaseRequest {
	requestType: RequestType.imagecaptcha;
	imageCaptchaData: ImageCaptchaData;
	/** Delta from session headers (only changed/added headers) */
	headersDelta?: Partial<RequestHeaders>;
}

/**
 * Discriminated union of all request types
 */
export type CaptchaRequest =
	| SessionRequest
	| PoWCaptchaRequest
	| ImageCaptchaRequest;

export type CaptchaRequestRecord = mongoose.Document & CaptchaRequest;

// Schema for score components (embedded)
const ScoreComponentsSchemaObj = {
	baseScore: { type: Number, required: true },
	lScore: { type: Number, required: false },
	timeout: { type: Number, required: false },
	accessPolicy: { type: Number, required: false },
	unverifiedHost: { type: Number, required: false },
	webView: { type: Number, required: false },
};

// Schema for session data (embedded)
const SessionDataSchemaObj = {
	token: { type: String, required: true },
	score: { type: Number, required: true },
	threshold: { type: Number, required: true },
	scoreComponents: { type: ScoreComponentsSchemaObj, required: true },
	providerSelectEntropy: { type: Number, required: true },
	captchaType: { type: String, required: true },
	solvedImagesCount: { type: Number, required: false },
	powDifficulty: { type: Number, required: false },
	deleted: { type: Boolean, required: false },
	userSitekeyIpHash: { type: String, required: false },
	webView: { type: Boolean, required: true },
	iFrame: { type: Boolean, required: true },
	decryptedHeadHash: { type: String, required: true },
	reason: { type: String, required: false },
	blocked: { type: Boolean, required: false },
};

// Schema for PoW captcha data (embedded)
const PoWCaptchaDataSchemaObj = {
	challenge: { type: String, required: true },
	userAccount: { type: String, required: true },
	dappAccount: { type: String, required: true },
	result: {
		status: { type: String, enum: CaptchaStatus, required: true },
		reason: {
			type: String,
			enum: TranslationKeysSchema.options,
			required: false,
		},
		error: { type: String, required: false },
	},
	ja4: { type: String, required: false },
	providedIp: { type: CompositeIpAddressRecordSchemaObj, required: false },
	geolocation: { type: String, required: false },
	vpn: { type: Boolean, required: false },
};

// Schema for image captcha data (embedded)
const ImageCaptchaDataSchemaObj = {
	commitmentId: { type: String, required: false },
	requestHash: { type: String, required: false },
	userAccount: { type: String, required: true },
	dappAccount: { type: String, required: true },
	providerAccount: { type: String, required: false },
	datasetId: { type: String, required: false },
	result: {
		status: { type: String, enum: CaptchaStatus, required: true },
		reason: {
			type: String,
			enum: TranslationKeysSchema.options,
			required: false,
		},
		error: { type: String, required: false },
	},
	userSignature: { type: String, required: false },
	ja4: { type: String, required: false },
	providedIp: { type: CompositeIpAddressRecordSchemaObj, required: false },
	geolocation: { type: String, required: false },
	vpn: { type: Boolean, required: false },
	pending: { type: Boolean, required: false },
	salt: { type: String, required: false },
	deadlineTimestamp: { type: Date, required: false },
	threshold: { type: Number, required: false },
	userSubmitted: { type: Boolean, required: false },
	serverChecked: { type: Boolean, required: false },
};

/**
 * Mongoose schema for the unified requests collection
 * Uses discriminated union pattern with requestType field
 */
export const CaptchaRequestRecordSchema = new Schema<CaptchaRequestRecord>(
	{
		// Base fields
		requestId: { type: Number, required: true, unique: true },
		requestType: {
			type: String,
			enum: Object.values(RequestType),
			required: true,
		},
		sessionId: { type: String, required: true },
		previousRequestId: { type: Number, required: false },
		createdAt: { type: Date, required: true, expires: ONE_WEEK },
		lastUpdatedTimestamp: { type: Date, required: false },
		storedAtTimestamp: { type: Date, required: false },
		ipAddress: CompositeIpAddressRecordSchemaObj,
		siteKey: { type: String, required: false },

		// Session-specific fields
		sessionData: { type: SessionDataSchemaObj, required: false },
		headers: { type: Map, of: String, required: false },

		// PoW captcha specific fields
		powCaptchaData: { type: PoWCaptchaDataSchemaObj, required: false },

		// Image captcha specific fields
		imageCaptchaData: { type: ImageCaptchaDataSchemaObj, required: false },

		// Header delta for non-session requests
		headersDelta: { type: Map, of: String, required: false },
	},
	{
		// Enable discriminator key
		discriminatorKey: "requestType",
	},
);

// Indexes for efficient querying
CaptchaRequestRecordSchema.index({ requestId: 1 }, { unique: true });
CaptchaRequestRecordSchema.index({ sessionId: 1, createdAt: 1 });
CaptchaRequestRecordSchema.index({ requestType: 1, sessionId: 1 });
CaptchaRequestRecordSchema.index({ previousRequestId: 1 });
CaptchaRequestRecordSchema.index({ "powCaptchaData.challenge": 1 });
CaptchaRequestRecordSchema.index({ "imageCaptchaData.requestHash": 1 });
CaptchaRequestRecordSchema.index({ "imageCaptchaData.commitmentId": 1 });
CaptchaRequestRecordSchema.index({ "ipAddress.lower": 1 });
CaptchaRequestRecordSchema.index({ "ipAddress.upper": 1 });
CaptchaRequestRecordSchema.index({ createdAt: 1 });
CaptchaRequestRecordSchema.index({ siteKey: 1 });

/**
 * Counter schema for generating sequential request IDs
 */
export interface RequestIdCounter {
	name: string;
	seq: number;
}

export type RequestIdCounterRecord = mongoose.Document & RequestIdCounter;

export const RequestIdCounterSchema = new Schema<RequestIdCounterRecord>({
	name: { type: String, required: true, unique: true },
	seq: { type: Number, required: true, default: 0 },
});

RequestIdCounterSchema.index({ name: 1 }, { unique: true });
