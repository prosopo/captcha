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
export const getURLProtocol = (url: URL) => {
	if (url.hostname.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
		return "http";
	}
	return "https";
};

export const parseUrl = (domain: string) => {
	//check the url is not an email address
	if (domain.match(/@/)) {
		throw new Error("Invalid domain");
	}

	return new URL(
		`https://${domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}`,
	);
};

export const validateDomain = (domain: string): boolean => {
	if (domain.length > 253) {
		return false;
	}

	// https://stackoverflow.com/a/57129472/1178971
	if (
		!domain.match(
			/^\s*(?!.*?_.*?)(?!(?:[\d\w]+?\.)?\-[\w\d\.\-]*?)(?![\w\d]+?\-\.(?:[\d\w\.\-]+?))(?=[\w\d])(?=[\w\d\.\-]*?\.+[\w\d\.\-]*?)(?![\w\d\.\-]{254})(?!(?:\.?[\w\d\-\.]*?[\w\d\-]{64,}\.)+?)[\w\d\.\-]+?(?<![\w\d\-\.]*?\.[\d]+?)(?<=[\w\d\-]{2,})(?<![\w\d\-]{25})(\s*,\s*(?!.*?_.*?)(?!(?:[\d\w]+?\.)?\-[\w\d\.\-]*?)(?![\w\d]+?\-\.(?:[\d\w\.\-]+?))(?=[\w\d])(?=[\w\d\.\-]*?\.+[\w\d\.\-]*?)(?![\w\d\.\-]{254})(?!(?:\.?[\w\d\-\.]*?[\w\d\-]{64,}\.)+?)[\w\d\.\-]+?(?<![\w\d\-\.]*?\.[\d]+?)(?<=[\w\d\-]{2,})(?<![\w\d\-]{25}))*$/,
		)
	) {
		return false;
	}

	try {
		parseUrl(domain);
	} catch (e) {
		return false;
	}

	return true;
};

export const domainIsLocalhost = (domain: string) =>
	domain === "localhost" || domain === "127.0.0.1";
