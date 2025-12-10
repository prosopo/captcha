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

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/Header";
import { HotelResults } from "./components/HotelResults";
import { HotelSearch } from "./components/HotelSearch";
import { ProcaptchaProvider } from "./components/ProcaptchaProvider";
import type { Hotel, SearchParams } from "./types";

declare global {
	interface Window {
		procaptcha?: {
			execute: () => void;
		};
	}
}

const SITE_KEY = import.meta.env.VITE_PROSOPO_SITE_KEY;
const API_URL = import.meta.env.VITE_API_URL;
const RENDER_SCRIPT_URL = import.meta.env.VITE_RENDER_SCRIPT_URL;
const RENDER_SCRIPT_ID = import.meta.env.VITE_RENDER_SCRIPT_ID;

console.log("Demo starting with site key:", SITE_KEY);

export const App: React.FC = () => {
	const [hotels, setHotels] = useState<Hotel[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasSearched, setHasSearched] = useState(false);
	const [procaptchaToken, setProcaptchaToken] = useState<string | null>(null);
	const [pendingSearch, setPendingSearch] = useState<SearchParams | null>(null);
	const [isVerifying, setIsVerifying] = useState(false);

	// Load the Procaptcha bundle script
	useEffect(() => {
		if (document.getElementById(RENDER_SCRIPT_ID)) {
			return; // Script already loaded
		}

		const script = document.createElement("script");
		script.id = RENDER_SCRIPT_ID;
		script.src = RENDER_SCRIPT_URL;
		script.async = true;
		document.head.appendChild(script);

		return () => {
			// Cleanup function to remove script if component unmounts
			const existingScript = document.getElementById(RENDER_SCRIPT_ID);
			if (existingScript) {
				document.head.removeChild(existingScript);
			}
		};
	}, []);

	// Execute search when we have both a token and pending search params
	useEffect(() => {
		if (procaptchaToken && pendingSearch) {
			console.log(
				"Procaptcha verified, executing search with params:",
				pendingSearch,
			);
			executeSearch(pendingSearch);
			setPendingSearch(null);
		}
	}, [procaptchaToken, pendingSearch]);

	const executeSearch = async (searchParams: SearchParams) => {
		if (!procaptchaToken) {
			console.error("No Procaptcha token available for search");
			return;
		}

		setLoading(true);
		setError(null);
		setIsVerifying(false);

		try {
			const response = await fetch(`${API_URL}/api/search`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...searchParams,
					procaptchaResponse: procaptchaToken,
				}),
			});

			if (!response.ok) {
				throw new Error("Search failed. Please try again.");
			}

			const data = await response.json();
			setHotels(data.hotels || []);
			setHasSearched(true);

			// Reset token after successful use
			setProcaptchaToken(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			setHotels([]);
			setProcaptchaToken(null);
		} finally {
			setLoading(false);
			setIsVerifying(false);
		}
	};

	const handleSearch = async (searchParams: SearchParams) => {
		console.log("Search initiated with params:", searchParams);

		if (procaptchaToken) {
			// If we already have a token, execute search immediately
			await executeSearch(searchParams);
		} else {
			// Store search params and start verification
			setPendingSearch(searchParams);
			setIsVerifying(true);
			setError(null);

			// Trigger procaptcha execution via custom event
			const executeEvent = new CustomEvent("procaptcha:execute", {
				detail: { timestamp: Date.now() },
			});
			document.dispatchEvent(executeEvent);
		}
	};

	const handleProcaptchaSuccess = useCallback((token: string) => {
		console.log("Procaptcha verification successful, token received");
		setProcaptchaToken(token);
		setError(null);
	}, []);

	const handleProcaptchaError = useCallback((error: string) => {
		console.error("Procaptcha verification failed:", error);
		setError(`Verification failed: ${error}`);
		setProcaptchaToken(null);
		setIsVerifying(false);
		setPendingSearch(null);
	}, []);

	return (
		<ProcaptchaProvider
			siteKey={SITE_KEY}
			onSuccess={handleProcaptchaSuccess}
			onError={handleProcaptchaError}
		>
			<div className="min-h-screen bg-gray-50">
				<Header />

				<main className="container mx-auto px-4 py-8">
					<div className="max-w-6xl mx-auto">
						{/* Hero Section */}
						<div className="text-center mb-12">
							<h1 className="text-4xl font-bold text-gray-900 mb-4">
								Find Your Perfect Stay
							</h1>
							<p className="text-xl text-gray-600 max-w-2xl mx-auto">
								Search thousands of hotels worldwide with our secure booking
								platform. Protected by Procaptcha to ensure genuine searches.
							</p>
						</div>

						{/* Search Form */}
						<div className="bg-white rounded-lg shadow-lg p-6 mb-8">
							<HotelSearch
								onSearch={handleSearch}
								loading={loading}
								procaptchaToken={procaptchaToken}
								isVerifying={isVerifying}
							/>
						</div>

						{/* Error Message */}
						{error && (
							<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
								<div className="flex items-center">
									<div className="flex-shrink-0">
										<svg
											className="h-5 w-5 text-red-400"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<title>Error</title>
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<div className="ml-3">
										<p className="text-red-700">{error}</p>
									</div>
								</div>
							</div>
						)}

						{/* Results */}
						<HotelResults hotels={hotels} />
					</div>
				</main>
			</div>
		</ProcaptchaProvider>
	);
};

export default App;
