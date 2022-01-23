import {hexHash} from "./util";
import {MerkleNodeInterface} from "./types/merkle";

export class CaptchaMerkleTree {
    leaves: MerkleNode[]
    layers: string[][]
    root: MerkleNode | undefined

    constructor() {
        this.leaves = [];
        this.layers = [];
    }


    build(leaves: string[]) {
        // allow rebuild
        if (this.layers.length) {
            this.layers = [];
        }
        let layerZero: string[] = []
        for (let leaf of leaves) {
            let node = new MerkleNode(leaf)
            this.leaves.push(node)
            layerZero.push(node.hash);
        }
        this.layers.push(layerZero);
        this.root = this.buildMerkleTree(this.leaves)
    }


    buildMerkleTree(leaves) {
        //Builds the Merkle tree from a list of leaves. In case of an odd number of leaves, the last leaf is duplicated.

        const numLeaves = leaves.length;
        if (numLeaves == 1) {
            return leaves[0]
        }

        let parents: MerkleNode[] = [];

        let leafIndex = 0;
        let newLayer: string[] = [];
        while (leafIndex < numLeaves) {
            let leftChild = leaves[leafIndex];
            let rightChild = (leafIndex + 1 < numLeaves) ? leaves[leafIndex + 1] : leftChild;
            let parentNode = this.createParent(leftChild, rightChild)
            newLayer.push(parentNode.hash);
            parents.push(parentNode);
            leafIndex += 2;
        }
        this.layers.push(newLayer);

        return this.buildMerkleTree(parents)
    }

    createParent(leftChild, rightChild): MerkleNode {
        let parent = new MerkleNode(hexHash([leftChild.hash, rightChild.hash].join()))
        leftChild.parent = parent;
        rightChild.parent = parent;
        return parent
    }

    proof(leafHash: string) {
        let proofTree: string[][] = [];
        let layerNum = 0;
        while (layerNum < this.layers.length) {
            let leafIndex = this.layers[layerNum].indexOf(leafHash);
            // if layer 0 leaf index is 3, it should be partnered with 2: [L0,L1],[L2,L3],[L3,L4],...
            // layer one pairs looks like [L0L1, L2L3], [L3L4, L5L6],...etc
            const partnerIndex = (leafIndex % 2 && leafIndex > 0) ? leafIndex - 1 : leafIndex + 1;
            let pair = [leafHash];
            let layer = this.layers[layerNum];
            if (partnerIndex < layer.length) {
                // determine whether the leaf sits on the left or the right of its partner
                if (partnerIndex > leafIndex) {
                    pair.push(layer[partnerIndex])
                } else {
                    pair.unshift(layer[partnerIndex]);
                }
            }
            proofTree.push(pair);
            layerNum += 1;
            leafHash = hexHash(pair.join())
        }

        return proofTree;

    }

}

class MerkleNode implements MerkleNodeInterface {
    hash: string;
    parent: string | null;

    constructor(hash) {
        this.hash = hash
        this.parent = null
    }
}