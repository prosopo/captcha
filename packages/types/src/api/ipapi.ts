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

// IP API Types for ipapi.is
export interface IPApiDatacenterInfo {
	datacenter: string;
	network: string;
	country?: string;
	region?: string;
	city?: string;
	domain?: string;
	code?: string;
	name?: string;
	state?: string;
	service?: string;
	network_border_group?: string;
}

export interface IPApiCompanyInfo {
	name: string;
	abuser_score: string;
	domain: string;
	type: "hosting" | "education" | "government" | "banking" | "business" | "isp";
	network: string;
	whois: string;
}

export interface IPApiAbuseInfo {
	name: string;
	address: string;
	email: string;
	phone?: string;
	country?: string;
}

export interface IPApiASNInfo {
	asn: number;
	abuser_score: string;
	route: string;
	descr: string;
	country: string;
	active: boolean;
	org: string;
	domain: string;
	abuse: string;
	type: "hosting" | "education" | "government" | "banking" | "business" | "isp";
	created: string;
	updated: string;
	rir: string;
	whois: string;
}

export interface IPApiLocationInfo {
	is_eu_member: boolean;
	calling_code: string;
	currency_code: string;
	continent: string;
	country: string;
	country_code: string;
	state: string;
	city: string;
	latitude: number;
	longitude: number;
	zip: string;
	timezone: string;
	local_time: string;
	local_time_unix: number;
	is_dst: boolean;
	other?: string[];
}

export interface IPApiVPNInfo {
	ip: string;
	service: string;
	url: string;
	type: "exit_node" | "vpn_server";
	last_seen: number;
	last_seen_str: string;
	exit_node_region?: string;
	country_code: string;
	city_name: string;
	latitude: number;
	longitude: number;
}

export interface IPApiResponse {
	ip: string;
	rir: "ARIN" | "RIPE" | "APNIC" | "LACNIC" | "AFRINIC";
	is_bogon: boolean;
	is_mobile: boolean;
	is_satellite: boolean;
	is_crawler: boolean | string;
	is_datacenter: boolean;
	is_tor: boolean;
	is_proxy: boolean;
	is_vpn: boolean;
	is_abuser: boolean;
	datacenter?: IPApiDatacenterInfo;
	company?: IPApiCompanyInfo;
	abuse?: IPApiAbuseInfo;
	asn?: IPApiASNInfo;
	location?: IPApiLocationInfo;
	vpn?: IPApiVPNInfo;
	elapsed_ms: number;
}

export interface IPInfoResult {
	// Core identification
	ip: string;
	isValid: boolean;

	// Threat indicators
	isVPN: boolean;
	isTor: boolean;
	isProxy: boolean;
	isDatacenter: boolean;
	isAbuser: boolean;
	isMobile: boolean;
	isSatellite: boolean;

	// Provider information
	providerName?: string;
	providerType?:
		| "hosting"
		| "education"
		| "government"
		| "banking"
		| "business"
		| "isp";
	asnNumber?: number;
	asnOrganization?: string;

	// Geolocation
	country?: string;
	countryCode?: string;
	region?: string;
	city?: string;
	latitude?: number;
	longitude?: number;
	timezone?: string;

	// VPN specific details
	vpnService?: string;
	vpnType?: "exit_node" | "vpn_server";

	// Risk scoring
	abuserScore?: string;
	companyAbuserScore?: string;

	// Raw response for debugging
	rawResponse?: IPApiResponse;
}

export interface IPInfoError {
	isValid: false;
	error: string;
	ip: string;
}

export type IPInfoResponse = IPInfoResult | IPInfoError;

// IP Comparison Types
export type IPConnectionType =
	| "datacenter"
	| "mobile"
	| "satellite"
	| "residential"
	| "unknown";

type IPDetails = {
	provider?: string;
	connectionType: IPConnectionType;
	isVpnOrProxy: boolean;
	country?: string;
	city?: string;
	coordinates?: { latitude: number; longitude: number };
};

export interface IPComparisonResult {
	ipsMatch: boolean;
	ip1: string;
	ip2: string;
	comparison?: {
		differentProviders: boolean;
		differentConnectionTypes: boolean;
		distanceKm?: number;
		anyVpnOrProxy: boolean;
		ip1Details: IPDetails;
		ip2Details: IPDetails;
	};
}

export interface IPComparisonError {
	error: string;
	ip1: string;
	ip2: string;
	ip1Error?: string;
	ip2Error?: string;
}

export type IPComparisonResponse = IPComparisonResult | IPComparisonError;

export interface IPAssessmentResult {
	verdict: "match" | "similar" | "wildlyDifferent";
	distanceKm?: number;
	comparison?: IPComparisonResult["comparison"];
}
