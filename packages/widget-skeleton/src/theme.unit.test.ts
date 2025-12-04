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

import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme, type Theme } from "./theme.js";

describe("theme", () => {
    describe("lightTheme", () => {
        it("should be defined", () => {
            expect(lightTheme).toBeDefined();
        });

        it("should have correct mode", () => {
            expect(lightTheme.palette.mode).toBe("light");
        });

        it("should have palette structure", () => {
            expect(lightTheme.palette).toBeDefined();
            expect(lightTheme.palette.primary).toBeDefined();
            expect(lightTheme.palette.background).toBeDefined();
            expect(lightTheme.palette.error).toBeDefined();
            expect(typeof lightTheme.palette.border).toBe("string");
            expect(typeof lightTheme.palette.logoFill).toBe("string");
            expect(lightTheme.palette.grey).toBeDefined();
        });

        it("should have spacing structure", () => {
            expect(lightTheme.spacing).toBeDefined();
            expect(typeof lightTheme.spacing.unit).toBe("number");
            expect(typeof lightTheme.spacing.half).toBe("number");
        });

        it("should have font structure", () => {
            expect(lightTheme.font).toBeDefined();
            expect(typeof lightTheme.font.fontFamily).toBe("string");
            expect(typeof lightTheme.font.color).toBe("string");
        });
    });

    describe("darkTheme", () => {
        it("should be defined", () => {
            expect(darkTheme).toBeDefined();
        });

        it("should have correct mode", () => {
            expect(darkTheme.palette.mode).toBe("dark");
        });

        it("should have palette structure", () => {
            expect(darkTheme.palette).toBeDefined();
            expect(darkTheme.palette.primary).toBeDefined();
            expect(darkTheme.palette.background).toBeDefined();
            expect(darkTheme.palette.error).toBeDefined();
            expect(typeof darkTheme.palette.border).toBe("string");
            expect(typeof darkTheme.palette.logoFill).toBe("string");
            expect(darkTheme.palette.grey).toBeDefined();
        });

        it("should have spacing structure", () => {
            expect(darkTheme.spacing).toBeDefined();
            expect(typeof darkTheme.spacing.unit).toBe("number");
            expect(typeof darkTheme.spacing.half).toBe("number");
        });

        it("should have font structure", () => {
            expect(darkTheme.font).toBeDefined();
            expect(typeof darkTheme.font.fontFamily).toBe("string");
            expect(typeof darkTheme.font.color).toBe("string");
        });
    });

    describe("Theme type", () => {
        it("should accept lightTheme as Theme", () => {
            const theme: Theme = lightTheme;
            expect(theme).toBe(lightTheme);
        });

        it("should accept darkTheme as Theme", () => {
            const theme: Theme = darkTheme;
            expect(theme).toBe(darkTheme);
        });
    });

    describe("theme differences", () => {
        it("should have different background colors", () => {
            expect(lightTheme.palette.background.default).not.toBe(
                darkTheme.palette.background.default,
            );
        });

        it("should have different font colors", () => {
            expect(lightTheme.font.color).not.toBe(darkTheme.font.color);
        });

        it("should have different logoFill colors", () => {
            expect(lightTheme.palette.logoFill).not.toBe(
                darkTheme.palette.logoFill,
            );
        });

        it("should have same primary color", () => {
            expect(lightTheme.palette.primary.main).toBe(
                darkTheme.palette.primary.main,
            );
        });

        it("should have same spacing values", () => {
            expect(lightTheme.spacing.unit).toBe(darkTheme.spacing.unit);
            expect(lightTheme.spacing.half).toBe(darkTheme.spacing.half);
        });

        it("should have same font family", () => {
            expect(lightTheme.font.fontFamily).toBe(darkTheme.font.fontFamily);
        });
    });
});

