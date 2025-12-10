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

import { loadEnv } from "@prosopo/dotenv";
import cors from "cors";
import express from "express";
import type {
	ApiError,
	Hotel,
	SearchParams,
	SearchResponse,
} from "../frontend/types";

// Load environment variables
loadEnv();

const app = express();
const PORT = process.env.PORT || 9234;
const PROSOPO_VERIFY_HOST =
	process.env.PROSOPO_VERIFY_HOST || "http://localhost:9235/development";
const PROSOPO_SITE_KEY =
	process.env.PROSOPO_SITE_KEY ||
	"5GCP69mhanZqJqnTvaaGvJCJZWSahz6xE2c7bTGETqSB5KDK";
const PROSOPO_SECRET_KEY = process.env.PROSOPO_SECRET_KEY;

if (!PROSOPO_SECRET_KEY) {
	throw new Error("Missing secret key");
}

// Middleware
app.use(
	cors({
		origin: ["http://localhost:9233"],
		credentials: true,
	}),
);
app.use(express.json());

// Mock hotel data
const MOCK_HOTELS: Hotel[] = [
	{
		id: "hotel-1",
		name: "Grand Palace Hotel",
		description:
			"Luxury 5-star hotel in the heart of the city with stunning views, world-class amenities, and exceptional service.",
		image:
			"https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
		rating: 5,
		reviewCount: 342,
		price: 299,
		currency: "$",
		amenities: [
			"Free WiFi",
			"Pool",
			"Spa",
			"Fitness Center",
			"Restaurant",
			"Room Service",
		],
		location: {
			address: "123 Luxury Avenue",
			city: "New York",
			country: "United States",
			coordinates: { lat: 40.7614, lng: -73.9776 },
		},
		availability: true,
		cancellationPolicy: "Free cancellation until 24h before check-in",
	},
	{
		id: "hotel-2",
		name: "Boutique Central",
		description:
			"Modern boutique hotel with stylish rooms, rooftop bar, and personalized service in a prime downtown location.",
		image:
			"https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
		rating: 4,
		reviewCount: 187,
		price: 189,
		currency: "$",
		amenities: ["Free WiFi", "Rooftop Bar", "Business Center", "Pet Friendly"],
		location: {
			address: "456 Downtown Street",
			city: "New York",
			country: "United States",
			coordinates: { lat: 40.7505, lng: -73.9934 },
		},
		availability: true,
		cancellationPolicy: "Free cancellation until 48h before check-in",
	},
	{
		id: "hotel-3",
		name: "City Express Inn",
		description:
			"Comfortable and affordable hotel perfect for business travelers and tourists exploring the city.",
		image:
			"https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
		rating: 3,
		reviewCount: 89,
		price: 129,
		currency: "$",
		amenities: ["Free WiFi", "Breakfast Included", "Parking"],
		location: {
			address: "789 Business District",
			city: "New York",
			country: "United States",
			coordinates: { lat: 40.7282, lng: -73.9942 },
		},
		availability: true,
		cancellationPolicy: "Non-refundable",
	},
	{
		id: "hotel-4",
		name: "Riverside Resort",
		description:
			"Tranquil resort by the river featuring spacious suites, multiple dining options, and recreational facilities.",
		image:
			"https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
		rating: 4,
		reviewCount: 256,
		price: 249,
		currency: "$",
		amenities: [
			"Pool",
			"Spa",
			"Golf Course",
			"Multiple Restaurants",
			"Conference Rooms",
		],
		location: {
			address: "101 Riverside Drive",
			city: "New York",
			country: "United States",
			coordinates: { lat: 40.7829, lng: -73.9654 },
		},
		availability: false,
		cancellationPolicy: "Free cancellation until 72h before check-in",
	},
];

// Validate Procaptcha token with the Prosopo server
async function validateProcaptchaToken(token: string): Promise<boolean> {
	try {
		const response = await fetch(`${PROSOPO_VERIFY_HOST}/siteverify`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				token: token,
				secret: PROSOPO_SECRET_KEY,
			}),
		});

		const result = await response.json();
		console.log({ result: JSON.stringify(result, null, 2) });
		return result.verified === true;
	} catch (error) {
		console.error("Procaptcha validation failed:", error);
		return false;
	}
}

// Filter hotels based on search parameters
function filterHotels(params: SearchParams): Hotel[] {
	return MOCK_HOTELS.filter((hotel) => {
		// Simple destination matching (case-insensitive)
		const destination = params.destination.toLowerCase();
		const cityMatch = hotel.location.city.toLowerCase().includes(destination);
		const nameMatch = hotel.name.toLowerCase().includes(destination);

		return cityMatch || nameMatch;
	});
}

// API Routes
app.post("/api/search", async (req, res) => {
	try {
		const {
			procaptchaResponse,
			...searchParams
		}: SearchParams & { procaptchaResponse: string } = req.body;

		// Validate required fields
		if (!procaptchaResponse) {
			return res.status(400).json({
				error: "Procaptcha verification required",
				code: "MISSING_PROCAPTCHA",
			} as ApiError);
		}

		if (
			!searchParams.destination ||
			!searchParams.checkinDate ||
			!searchParams.checkoutDate
		) {
			return res.status(400).json({
				error: "Missing required search parameters",
				code: "MISSING_PARAMS",
			} as ApiError);
		}

		// Validate Procaptcha token
		const isValidToken = await validateProcaptchaToken(procaptchaResponse);
		if (!isValidToken) {
			return res.status(403).json({
				error: "Invalid Procaptcha verification",
				code: "INVALID_PROCAPTCHA",
			} as ApiError);
		}

		// Simulate some processing time
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Filter hotels based on search criteria
		const hotels = filterHotels(searchParams);

		const response: SearchResponse = {
			hotels,
			total: hotels.length,
			searchId: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			timestamp: new Date().toISOString(),
		};

		res.json(response);
	} catch (error) {
		console.error("Search API error:", error);
		res.status(500).json({
			error: "Internal server error",
			code: "INTERNAL_ERROR",
		} as ApiError);
	}
});

// Health check endpoint
app.get("/health", (req, res) => {
	res.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		service: "api-protection-demo",
	});
});

// Demo information endpoint
app.get("/api/demo-info", (req, res) => {
	res.json({
		title: "Procaptcha API Protection Demo",
		description:
			"This demo showcases how Procaptcha protects APIs from automated scraping and abuse.",
		features: [
			"Invisible Procaptcha protection",
			"Server-side token validation",
			"Seamless user experience",
			"Protection against bots and scrapers",
		],
		procaptchaConfig: {
			siteKey: PROSOPO_SITE_KEY,
			serverUrl: PROSOPO_VERIFY_HOST,
		},
	});
});

// Error handling middleware
app.use(
	(
		err: any,
		req: express.Request,
		res: express.Response,
		next: express.NextFunction,
	) => {
		console.error("Unhandled error:", err);
		res.status(500).json({
			error: "Internal server error",
			code: "UNHANDLED_ERROR",
		} as ApiError);
	},
);

// 404 handler
app.use("*", (req, res) => {
	res.status(404).json({
		error: "Endpoint not found",
		code: "NOT_FOUND",
	} as ApiError);
});

// Start server
app.listen(PORT, () => {
	console.log(
		`🔒 API Protection Demo Server running on http://localhost:${PORT}`,
	);
	console.log(`📊 Health check: http://localhost:${PORT}/health`);
	console.log(`🏨 Search endpoint: http://localhost:${PORT}/api/search`);
	console.log(`📝 Demo info: http://localhost:${PORT}/api/demo-info`);
	console.log(`🔐 Procaptcha Server: ${PROSOPO_VERIFY_HOST}`);
	console.log(`🔑 Site Key: ${PROSOPO_SITE_KEY}`);
});
