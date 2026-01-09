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

// Types and interfaces
export interface User {
	id: string;
	name: string;
	email: string;
	age?: number;
	createdAt: Date;
}

export interface DatabaseConfig {
	host: string;
	port: number;
	database: string;
	username: string;
	password: string;
}

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export type UserStatus = "active" | "inactive" | "suspended";

// Utility functions
export function validateEmail(email: string): ValidationResult {
	const errors: string[] = [];

	if (!email || email.trim().length === 0) {
		errors.push("Email is required");
	} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		errors.push("Invalid email format");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export function validateUser(user: Partial<User>): ValidationResult {
	const errors: string[] = [];

	if (!user.name || user.name.trim().length === 0) {
		errors.push("Name is required");
	}

	if (!user.email) {
		errors.push("Email is required");
	} else {
		const emailValidation = validateEmail(user.email);
		if (!emailValidation.isValid) {
			errors.push(...emailValidation.errors);
		}
	}

	if (user.age !== undefined && (user.age < 0 || user.age > 150)) {
		errors.push("Age must be between 0 and 150");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export function sanitizeString(input: string): string {
	return input.trim().replace(/<[^>]*>/g, "");
}

export async function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateId(): string {
	return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function calculateAge(birthDate: Date): number {
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();

	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}

	return age;
}

// UserService class
export class UserService {
	private users: Map<string, User> = new Map();
	private dbConfig?: DatabaseConfig;

	constructor(dbConfig?: DatabaseConfig) {
		this.dbConfig = dbConfig;
	}

	async createUser(userData: Omit<User, "id" | "createdAt">): Promise<User> {
		const validation = validateUser(userData);
		if (!validation.isValid) {
			throw new Error(`Invalid user data: ${validation.errors.join(", ")}`);
		}

		const user: User = {
			...userData,
			id: generateId(),
			createdAt: new Date(),
		};

		this.users.set(user.id, user);

		// Simulate database operation
		if (this.dbConfig) {
			await this.persistToDatabase(user);
		}

		return user;
	}

	async getUserById(id: string): Promise<User | null> {
		const user = this.users.get(id);
		if (!user && this.dbConfig) {
			// Simulate database lookup
			return await this.fetchFromDatabase(id);
		}
		return user || null;
	}

	async updateUser(id: string, updates: Partial<Omit<User, "id" | "createdAt">>): Promise<User | null> {
		const existingUser = await this.getUserById(id);
		if (!existingUser) {
			return null;
		}

		const updatedUser = { ...existingUser, ...updates };
		const validation = validateUser(updatedUser);
		if (!validation.isValid) {
			throw new ValidationError(`Invalid update data: ${validation.errors.join(", ")}`, validation.errors);
		}

		this.users.set(id, updatedUser);

		if (this.dbConfig) {
			await this.persistToDatabase(updatedUser);
		}

		return updatedUser;
	}

	async deleteUser(id: string): Promise<boolean> {
		const exists = this.users.has(id);
		if (exists) {
			this.users.delete(id);
			if (this.dbConfig) {
				await this.deleteFromDatabase(id);
			}
			return true;
		}

		if (this.dbConfig) {
			return await this.deleteFromDatabase(id);
		}

		return false;
	}

	async getAllUsers(): Promise<User[]> {
		const inMemoryUsers = Array.from(this.users.values());

		if (this.dbConfig) {
			const dbUsers = await this.fetchAllFromDatabase();
			// Merge in-memory and database users, preferring in-memory
			const userMap = new Map<string, User>();
			dbUsers.forEach(user => userMap.set(user.id, user));
			inMemoryUsers.forEach(user => userMap.set(user.id, user));
			return Array.from(userMap.values());
		}

		return inMemoryUsers;
	}

	async getUsersByStatus(status: UserStatus): Promise<User[]> {
		const allUsers = await this.getAllUsers();
		return allUsers.filter(user => {
			// Simulate status calculation based on activity
			const daysSinceCreated = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
			if (daysSinceCreated < 1) return status === "active";
			if (daysSinceCreated < 30) return status === "active";
			return status === "inactive";
		});
	}

	// Database simulation methods
	private async persistToDatabase(user: User): Promise<void> {
		// Simulate database write delay
		await delay(10);
		// In a real implementation, this would write to the database
		console.log(`Persisted user ${user.id} to database`);
	}

	private async fetchFromDatabase(id: string): Promise<User | null> {
		// Simulate database read delay
		await delay(5);
		// In a real implementation, this would query the database
		return null; // Simulate not found in database
	}

	private async fetchAllFromDatabase(): Promise<User[]> {
		// Simulate database read delay
		await delay(15);
		// In a real implementation, this would query the database
		return [];
	}

	private async deleteFromDatabase(id: string): Promise<boolean> {
		// Simulate database delete delay
		await delay(8);
		// In a real implementation, this would delete from database
		return false; // Simulate not found
	}
}

// Error classes
export class ValidationError extends Error {
	constructor(message: string, public readonly errors: string[]) {
		super(message);
		this.name = "ValidationError";
	}
}

export class DatabaseError extends Error {
	constructor(message: string, public readonly code?: string) {
		super(message);
		this.name = "DatabaseError";
	}
}

// Higher-order functions
export function withRetry<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	maxRetries: number = 3,
	delayMs: number = 1000
): T {
	return (async (...args: Parameters<T>) => {
		let lastError: Error;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await fn(...args);
			} catch (error) {
				lastError = error as Error;
				if (attempt < maxRetries) {
					await delay(delayMs * Math.pow(2, attempt)); // Exponential backoff
				}
			}
		}

		throw lastError!;
	}) as T;
}

export function memoize<T extends (...args: any[]) => any>(fn: T): T {
	const cache = new Map<string, ReturnType<T>>();

	return ((...args: Parameters<T>) => {
		const key = JSON.stringify(args);
		if (cache.has(key)) {
			return cache.get(key)!;
		}
		const result = fn(...args);
		cache.set(key, result);
		return result;
	}) as T;
}

// Constants
export const MAX_USERS = 1000;
export const DEFAULT_USER_AGE = 18;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Export database service
export { DatabaseService, type DatabaseConnection } from "./database.js";
