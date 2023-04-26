// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { hexHashArray } from './util'
import { MerkleLayer, MerkleLeaf, MerkleNodeInterface, MerkleProof, MerkleProofLayer } from '../types/merkle'

class MerkleNode implements MerkleNodeInterface {
    hash: string

    parent: string | null

    constructor(hash) {
        this.hash = hash
        this.parent = null
    }
}

export class CaptchaMerkleTree {
    leaves: MerkleNode[]

    layers: MerkleLayer[]

    root: MerkleNode | undefined

    constructor() {
        this.leaves = []
        this.layers = []
    }

    build(leaves: string[]) {
        // allow rebuild
        if (this.layers.length) {
            this.layers = []
        }
        const layerZero: string[] = []
        for (const leaf of leaves) {
            const node = new MerkleNode(leaf)
            this.leaves.push(node)
            layerZero.push(node.hash)
        }
        this.layers.push(layerZero)
        this.root = this.buildMerkleTree(this.leaves)
    }

    buildMerkleTree(leaves: MerkleNode[]) {
        // Builds the Merkle tree from a list of leaves. In case of an odd number of leaves, the last leaf is duplicated.

        const numLeaves = leaves.length
        if (numLeaves === 1) {
            return leaves[0]
        }

        const parents: MerkleNode[] = []

        let leafIndex = 0
        const newLayer: string[] = []
        while (leafIndex < numLeaves) {
            const leftChild = leaves[leafIndex]
            const rightChild = leafIndex + 1 < numLeaves ? leaves[leafIndex + 1] : leftChild
            const parentNode = this.createParent(leftChild, rightChild)
            newLayer.push(parentNode.hash)
            parents.push(parentNode)
            leafIndex += 2
        }
        this.layers.push(newLayer)

        return this.buildMerkleTree(parents)
    }

    createParent(leftChild, rightChild): MerkleNode {
        const parent = new MerkleNode(hexHashArray([leftChild.hash, rightChild.hash]))
        leftChild.parent = parent
        rightChild.parent = parent
        return parent
    }

    proof(leafHash: MerkleLeaf): MerkleProof {
        const proofTree: MerkleProofLayer[] = []
        let layerNum = 0
        while (layerNum < this.layers.length - 1) {
            const leafIndex = this.layers[layerNum].indexOf(leafHash)
            // if layer 0 leaf index is 3, it should be partnered with 2: [L0,L1],[L2,L3],[L3,L4],...
            // layer one pairs looks like [L0L1, L2L3], [L3L4, L5L6],...etc
            let partnerIndex = leafIndex % 2 && leafIndex > 0 ? leafIndex - 1 : leafIndex + 1
            // if there are an odd number of leaves in the layer, the last leaf is duplicated
            if (partnerIndex > this.layers[layerNum].length - 1) {
                partnerIndex = leafIndex
            }
            const pair: MerkleLeaf[] = [leafHash]
            const layer = this.layers[layerNum]
            // determine whether the leaf sits on the left or the right of its partner
            if (partnerIndex > leafIndex) {
                pair.push(layer[partnerIndex])
            } else {
                pair.unshift(layer[partnerIndex])
            }
            proofTree.push([pair[0], pair[1]])
            layerNum += 1
            leafHash = hexHashArray(pair)
        }
        return [...proofTree, [this.layers[this.layers.length - 1][0]]]
    }
}

export function verifyProof(leaf: MerkleLeaf, proof: MerkleProof): boolean {
    try {
        if (proof[0].indexOf(leaf) === -1) {
            return false
        }
        for (const [layerIndex, layer] of proof.entries()) {
            leaf = hexHashArray(layer)
            if (proof[layerIndex + 1].indexOf(leaf) === -1) {
                return false
            }
            if (leaf === proof[proof.length - 1][0]) {
                return true
            }
        }
        return false
    } catch (err) {
        return false
    }
}
