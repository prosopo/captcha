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

export const Header: React.FC = () => {
	return (
		<header className="bg-white shadow-sm border-b border-gray-200">
			<div className="container mx-auto px-4 py-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<div className="flex items-center">
							<svg
								className="h-8 w-8 text-blue-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
								/>
							</svg>
							<h1 className="ml-2 text-2xl font-bold text-gray-900">
								SecureStay
							</h1>
						</div>
						<span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
							Protected by Procaptcha
						</span>
					</div>

					<nav className="hidden md:flex items-center space-x-6">
						<a
							href="#"
							className="text-gray-600 hover:text-gray-900 transition-colors"
						>
							Destinations
						</a>
						<a
							href="#"
							className="text-gray-600 hover:text-gray-900 transition-colors"
						>
							Deals
						</a>
						<a
							href="#"
							className="text-gray-600 hover:text-gray-900 transition-colors"
						>
							My Trips
						</a>
						<button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
							Sign In
						</button>
					</nav>

					{/* Mobile menu button */}
					<button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100">
						<svg
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 6h16M4 12h16M4 18h16"
							/>
						</svg>
					</button>
				</div>
			</div>
		</header>
	);
};
