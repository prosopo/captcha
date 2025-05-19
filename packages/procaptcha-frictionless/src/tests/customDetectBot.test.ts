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

import { describe, it, expect, vi } from 'vitest';
import { withTimeout } from '../customDetectBot.js';
import { ProsopoEnvError } from "@prosopo/common";

describe('withTimeout', () => {
    it('should resolve with the promise result when promise resolves before timeout', async () => {
        const result = 'success';
        const promise = Promise.resolve(result);
        
        const response = await withTimeout(promise, 1000);
        
        expect(response).toBe(result);
    });
    
    it('should reject with original error when promise rejects before timeout', async () => {
        const errorMessage = 'Original error';
        const promise = Promise.reject(new Error(errorMessage));
        
        await expect(withTimeout(promise, 1000)).rejects.toThrow(errorMessage);
    });
    
    it('should reject with timeout error when promise does not resolve within the timeout', async () => {
        const promise = new Promise((resolve) => {
            setTimeout(resolve, 500);
        });
        
        vi.useFakeTimers();
        
        const timeoutPromise = withTimeout(promise, 100);
        
        vi.advanceTimersByTime(200);
        
        await expect(timeoutPromise).rejects.toThrow(ProsopoEnvError);
        await expect(timeoutPromise).rejects.toEqual(expect.objectContaining({
            message: 'API.UNKNOWN',
            translationKey: 'API.UNKNOWN'
        }));
        
        vi.useRealTimers();
    });
    
    it('should respect the provided timeout duration', async () => {
        vi.useFakeTimers();
        
        const fastResolve = Promise.resolve('success');
        const fastResult = withTimeout(fastResolve, 1000);
        
        const slowPromise = new Promise((resolve) => {
            setTimeout(() => resolve('slow'), 2000);
        });
        const slowWithTimeout = withTimeout(slowPromise, 1000);
        
        vi.advanceTimersByTime(500);
        expect(await fastResult).toBe('success');
        
        vi.advanceTimersByTime(600);
        await expect(slowWithTimeout).rejects.toThrow(ProsopoEnvError);
        
        vi.useRealTimers();
    });
});
