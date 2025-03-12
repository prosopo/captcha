// // Copyright 2021-2025 Prosopo (UK) Ltd.
// //
// // Licensed under the Apache License, Version 2.0 (the "License");
// // you may not use this file except in compliance with the License.
// // You may obtain a copy of the License at
// //
// //     http://www.apache.org/licenses/LICENSE-2.0
// //
// // Unless required by applicable law or agreed to in writing, software
// // distributed under the License is distributed on an "AS IS" BASIS,
// // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// // See the License for the specific language governing permissions and
// // limitations under the License.

// import { solvePoW } from './solverService.js';

// /**
//  * Benchmark a specific difficulty value
//  * @param difficulty The difficulty value to test
//  * @param samples Number of samples to run for more accurate results
//  * @returns Average time in milliseconds to solve the PoW
//  */
// const benchmarkDifficulty = (difficulty: bigint, samples: number = 10): number => {
//     const testData = "benchmark_data";
//     let totalTime = 0;
    
//     for (let i = 0; i < samples; i++) {
//         // Add a small random string to ensure different hashes for each sample
//         const randomizedData = testData + Math.random().toString(36).substring(2);
//         const start = Date.now();
//         try {
//             solvePoW(randomizedData, difficulty, 10000); // 10 second timeout
//             const elapsed = Date.now() - start;
//             totalTime += elapsed;
//             console.log(`Sample ${i+1}: ${elapsed}ms`);
//         } catch (error) {
//             console.log(`Sample ${i+1} timed out`);
//             // If it times out, consider it as taking the max time
//             totalTime += 10000;
//         }
//     }
    
//     return totalTime / samples;
// };

// /**
//  * Find a difficulty value that results in a solution time close to the target
//  * @param targetTime Target solution time in milliseconds
//  * @returns The difficulty value that results in a solution time closest to the target
//  */
// const findDifficultyForTime = async (targetTime: number): Promise<bigint> => {
//     console.log(`\nFinding difficulty for target time: ${targetTime}ms`);
    
//     let minDifficulty = 115777954460797968348934318628681964505143364794465559087792611158302788682726n; // these are all reasonable
//     let maxDifficulty = 115792265943922275005418202416386872668309082643147782964402960334393874318309n; // trust me
//     let currentDifficulty = 115791647525550000827488589184312722123641027794666345134718053606362806485989n; // and this is a lovely place to start
//     let bestDifficulty = currentDifficulty;
//     let bestTimeDiff = Number.MAX_VALUE;
    
//     // Binary search approach with refinement
//     for (let iteration = 0; iteration < 15; iteration++) {
//         console.log(`\nIteration ${iteration + 1}, testing difficulty: ${currentDifficulty}`);
//         const avgTime = benchmarkDifficulty(currentDifficulty);
//         console.log(`Average solution time: ${avgTime}ms`);
        
//         const timeDiff = Math.abs(avgTime - targetTime);
        
//         // Keep track of the best match so far
//         if (timeDiff < bestTimeDiff) {
//             bestTimeDiff = timeDiff;
//             bestDifficulty = currentDifficulty;
//             console.log(`New best match! Difficulty: ${bestDifficulty} (off by ${bestTimeDiff}ms)`);
//         }
        
//         // Adjust search range
//         if (avgTime > targetTime) {
//             // Too slow, decrease difficulty
//             maxDifficulty = currentDifficulty;
//             currentDifficulty = (currentDifficulty + minDifficulty) / 2n;
//         } else {
//             // Too fast, increase difficulty
//             minDifficulty = currentDifficulty;
//             currentDifficulty = (currentDifficulty + maxDifficulty) / 2n;
            
//             // If maxDifficulty is still at max value, double current instead
//             if (maxDifficulty === 2n ** 256n - 1n) {
//                 currentDifficulty = currentDifficulty * 2n;
//             }
//         }
        
//         // Early exit if we're very close to the target
//         if (timeDiff < targetTime * 0.05) { // Within 5% of target
//             console.log(`Found difficulty within 5% of target time!`);
//             return currentDifficulty;
//         }
//     }
    
//     console.log(`\nBest difficulty found: ${bestDifficulty}`);
//     console.log(`Average solution time: ${benchmarkDifficulty(bestDifficulty, 10)}ms`);
//     return bestDifficulty;
// };

// /**
//  * Main function to benchmark difficulties for specific target times
//  */
// const main = async () => {
//     const targetTimes = [30, 200, 2000]; // in milliseconds
//     const results: Record<number, bigint> = {};
    
//     for (const targetTime of targetTimes) {
//         const difficulty = await findDifficultyForTime(targetTime);
//         results[targetTime] = difficulty;
//     }
    
//     console.log("\n=== FINAL RESULTS ===");
//     for (const [time, difficulty] of Object.entries(results)) {
//         console.log(`Target time: ${time}ms, Recommended difficulty: ${difficulty}`);
//         // Verify with more samples
//         const actualTime = benchmarkDifficulty(difficulty, 10);
//         console.log(`Verified average time: ${actualTime}ms\n`);
//     }
// };

// // Run the benchmark
// main().catch(console.error);