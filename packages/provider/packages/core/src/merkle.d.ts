import { MerkleNodeInterface } from './types';
declare class MerkleNode implements MerkleNodeInterface {
    hash: string;
    parent: string | null;
    constructor(hash: any);
}
export declare class CaptchaMerkleTree {
    leaves: MerkleNode[];
    layers: string[][];
    root: MerkleNode | undefined;
    constructor();
    build(leaves: string[]): void;
    buildMerkleTree(leaves: any): any;
    createParent(leftChild: any, rightChild: any): MerkleNode;
    proof(leafHash: string): string[][];
}
export {};
