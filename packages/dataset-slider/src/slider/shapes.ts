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
/**
 * A collection of puzzle piece shapes for slider captchas.
 * Each shape is defined as an SVG path that will be used to create
 * the cutout in the base image and the corresponding puzzle piece.
 */

export interface PuzzleShape {
	name: string;
	// SVG path data (d attribute)
	path: string;
	// Viewbox for the SVG
	viewBox: string;
	// Default width and height of the shape
	width: number;
	height: number;
}

/**
 * Collection of puzzle piece shapes
 */
export const PUZZLE_SHAPES: PuzzleShape[] = [
	// 1. Classic puzzle piece
	{
		name: "classic",
		path: `M 0,0 
               H 75 
               V 25 
               Q 85,25 85,40 
               T 75,55 
               V 80 
               H 0 
               V 55 
               Q -10,55 -10,40 
               T 0,25 
               Z`,
		viewBox: "-10 0 95 80",
		width: 75,
		height: 80,
	},

	// 2. Cloud shape
	{
		name: "cloud",
		path: `M 10,40
               Q 0,40 0,30
               Q 0,20 10,20
               Q 10,10 20,10
               Q 30,0 40,10
               Q 50,0 60,10
               Q 70,10 70,20
               Q 80,20 80,30
               Q 80,40 70,40
               Q 70,50 60,50
               Q 50,60 40,50
               Q 30,60 20,50
               Q 10,50 10,40
               Z`,
		viewBox: "0 0 80 60",
		width: 80,
		height: 60,
	},

	// 3. Hexagon
	{
		name: "hexagon",
		path: `M 30,0
               L 60,15
               L 60,45
               L 30,60
               L 0,45
               L 0,15
               Z`,
		viewBox: "0 0 60 60",
		width: 60,
		height: 60,
	},

	// 4. Star
	{
		name: "star",
		path: `M 25,0
               L 33,17
               L 50,20
               L 38,33
               L 40,50
               L 25,42
               L 10,50
               L 12,33
               L 0,20
               L 17,17
               Z`,
		viewBox: "0 0 50 50",
		width: 50,
		height: 50,
	},

	// 5. Heart
	{
		name: "heart",
		path: `M 25,45
               C 0,20 0,10 10,0
               C 15,-5 25,0 25,10
               C 25,0 35,-5 40,0
               C 50,10 50,20 25,45
               Z`,
		viewBox: "0 -5 50 50",
		width: 50,
		height: 45,
	},

	// 6. Rounded rectangle with notch
	{
		name: "roundedNotch",
		path: `M 10,0
               H 70
               Q 80,0 80,10
               V 50
               Q 80,60 70,60
               H 10
               Q 0,60 0,50
               V 40
               H 10
               V 50
               H 70
               V 10
               H 10
               V 20
               H 0
               V 10
               Q 0,0 10,0
               Z`,
		viewBox: "0 0 80 60",
		width: 80,
		height: 60,
	},

	// 7. Bubble
	{
		name: "bubble",
		path: `M 10,0
               Q 0,0 0,10
               V 50
               Q 0,60 10,60
               H 50
               Q 60,60 60,50
               V 40
               L 75,60
               L 70,35
               H 60
               V 10
               Q 60,0 50,0
               Z`,
		viewBox: "0 0 75 60",
		width: 75,
		height: 60,
	},

	// 8. Gear
	{
		name: "gear",
		path: `M 35,0
               L 40,10
               L 50,10
               L 55,0
               L 65,5
               L 60,15
               L 65,25
               L 75,25
               L 75,35
               L 65,35
               L 60,45
               L 65,55
               L 55,60
               L 50,50
               L 40,50
               L 35,60
               L 25,60
               L 20,50
               L 10,50
               L 5,60
               L 0,55
               L 5,45
               L 0,35
               L 0,25
               L 5,15
               L 0,5
               L 5,0
               L 10,10
               L 20,10
               L 25,0
               Z`,
		viewBox: "0 0 75 60",
		width: 75,
		height: 60,
	},

	// 9. Drop
	{
		name: "drop",
		path: `M 25,0
               Q 50,25 50,50
               Q 50,75 25,75
               Q 0,75 0,50
               Q 0,25 25,0
               Z`,
		viewBox: "0 0 50 75",
		width: 50,
		height: 75,
	},

	// 10. Key
	{
		name: "key",
		path: `M 15,35
               Q 15,25 25,25
               Q 35,25 35,35
               Q 35,45 25,45
               Q 15,45 15,35
               M 25,45
               V 65
               H 15
               V 55
               H 5
               V 65
               H 15
               H 25
               H 35
               V 55
               H 45
               V 65
               H 35
               H 25
               M 35,35
               H 85
               V 25
               H 35
               Q 35,15 25,15
               Q 15,15 15,25
               H 0
               V 35
               H 15
               Z`,
		viewBox: "0 15 85 50",
		width: 85,
		height: 50,
	},
];

// Default shape as a fallback
const DEFAULT_SHAPE: PuzzleShape = {
	name: "default",
	path: "M 0,0 H 60 V 60 H 0 Z", // Simple square
	viewBox: "0 0 60 60",
	width: 60,
	height: 60,
};

/**
 * Gets a random puzzle shape
 */
export function getRandomShape(): PuzzleShape {
	if (PUZZLE_SHAPES.length === 0) {
		return DEFAULT_SHAPE;
	}

	const index = Math.floor(Math.random() * PUZZLE_SHAPES.length);
	// Use non-null assertion since we know the index is within bounds
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	return PUZZLE_SHAPES[index]!;
}

/**
 * Creates an SVG string for a puzzle shape positioned at the specified coordinates
 */
export function createShapeSVG(
	shape: PuzzleShape,
	x: number,
	y: number,
	imageWidth: number,
	imageHeight: number,
): string {
	return `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(${x}, ${y})">
            <path d="${shape.path}" fill="black" />
        </g>
    </svg>`;
}

/**
 * Creates an SVG for a puzzle piece with the specified shape
 */
export function createPieceSVG(shape: PuzzleShape): string {
	return `
    <svg width="${shape.width}" height="${shape.height}" viewBox="${shape.viewBox}" xmlns="http://www.w3.org/2000/svg">
        <path d="${shape.path}" fill="black" />
    </svg>`;
}
