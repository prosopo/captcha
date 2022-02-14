/// <reference types="node" />
export declare function encodeStringAddress(address: string): any;
export declare function loadJSONFile(filePath: any): any;
export declare function readFile(filePath: any): Promise<Buffer>;
export declare function shuffleArray<T>(array: T[]): T[];
export declare function hexHash(data: string | Uint8Array): string;
export declare function imageHash(path: string): Promise<string>;
declare type PromiseQueueRes<T> = {
    data?: T;
    error?: Error;
}[];
/**
 * Executes promises in order
 * @param array - array of promises
 * @returns PromiseQueueRes\<T\>
 */
export declare function promiseQueue<T>(array: (() => Promise<T>)[]): Promise<PromiseQueueRes<T>>;
export declare function parseBlockNumber(blockNumberString: string): number;
export {};
