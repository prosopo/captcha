import fs from "node:fs";
import { ProsopoCliError } from "@prosopo/common";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loadJSONFile, readFile, writeJSONFile } from "../files.js";

describe("files", () => {
	const testFilePath = "/tmp/test-file.json";
	const testData = { key: "value", number: 123 };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Clean up test files
		if (fs.existsSync(testFilePath)) {
			fs.unlinkSync(testFilePath);
		}
	});

	describe("loadJSONFile", () => {
		test("should load and parse valid JSON file", () => {
			fs.writeFileSync(testFilePath, JSON.stringify(testData));
			const result = loadJSONFile(testFilePath);
			expect(result).toEqual(testData);
		});

		test("should throw ProsopoCliError when file does not exist", () => {
			const nonExistentPath = "/tmp/non-existent-file.json";
			expect(() => loadJSONFile(nonExistentPath)).toThrow(ProsopoCliError);
			expect(() => loadJSONFile(nonExistentPath)).toThrow("JSON_LOAD_FAILED");
		});

		test("should throw ProsopoCliError when file contains invalid JSON", () => {
			fs.writeFileSync(testFilePath, "invalid json content");
			expect(() => loadJSONFile(testFilePath)).toThrow(ProsopoCliError);
			expect(() => loadJSONFile(testFilePath)).toThrow("JSON_LOAD_FAILED");
		});

		test("should handle empty JSON object", () => {
			fs.writeFileSync(testFilePath, "{}");
			const result = loadJSONFile(testFilePath);
			expect(result).toEqual({});
		});

		test("should handle JSON array", () => {
			const arrayData = [1, 2, 3];
			fs.writeFileSync(testFilePath, JSON.stringify(arrayData));
			const result = loadJSONFile(testFilePath);
			expect(result).toEqual(arrayData);
		});
	});

	describe("writeJSONFile", () => {
		test("should write JSON data to file", async () => {
			await writeJSONFile(testFilePath, testData);
			expect(fs.existsSync(testFilePath)).toBe(true);
			const content = fs.readFileSync(testFilePath, "utf8");
			expect(JSON.parse(content)).toEqual(testData);
		});

		test("should handle empty object", async () => {
			await writeJSONFile(testFilePath, {});
			const content = fs.readFileSync(testFilePath, "utf8");
			expect(JSON.parse(content)).toEqual({});
		});

		test("should handle nested objects", async () => {
			const nestedData = { a: { b: { c: "value" } } };
			await writeJSONFile(testFilePath, nestedData);
			const content = fs.readFileSync(testFilePath, "utf8");
			expect(JSON.parse(content)).toEqual(nestedData);
		});

		test("should reject on write stream error", async () => {
			// Create a directory path to cause write error
			const invalidPath = "/invalid/path/that/does/not/exist/file.json";
			await expect(writeJSONFile(invalidPath, testData)).rejects.toThrow();
		});
	});

	describe("readFile", () => {
		test("should read file as Buffer", async () => {
			const content = "test content";
			fs.writeFileSync(testFilePath, content);
			const result = await readFile(testFilePath);
			expect(result).toBeInstanceOf(Buffer);
			expect(result.toString()).toBe(content);
		});

		test("should reject when file does not exist", async () => {
			const nonExistentPath = "/tmp/non-existent-file.txt";
			await expect(readFile(nonExistentPath)).rejects.toThrow();
		});

		test("should read binary file", async () => {
			const binaryContent = Buffer.from([0x01, 0x02, 0x03, 0x04]);
			fs.writeFileSync(testFilePath, binaryContent);
			const result = await readFile(testFilePath);
			expect(result).toEqual(binaryContent);
		});
	});
});
