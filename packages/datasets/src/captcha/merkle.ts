import { ProsopoError, hexHashArray } from '@prosopo/common'
// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import type { MerkleLayer, MerkleLeaf, MerkleNodeInterface, MerkleProof, MerkleProofLayer } from '@prosopo/types'
import { at } from '@prosopo/util'

class MerkleNode implements MerkleNodeInterface {
    hash: string

    parent: string | null

    constructor(hash: string) {
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
        this.root = this.buildMerkleTree(this.leaves)[0]
    }

    buildMerkleTree(leaves: MerkleNode[]): MerkleNode[] {
        // Builds the Merkle tree from a list of leaves. In case of an odd number of leaves, the last leaf is duplicated.

        const numLeaves = leaves.length
        if (numLeaves === 1) {
            return leaves
        }

        const parents: MerkleNode[] = []

        let leafIndex = 0
        const newLayer: string[] = []
        while (leafIndex < numLeaves) {
            const leftChild = leaves[leafIndex]
            if (leftChild === undefined) {
                throw new ProsopoError('DEVELOPER.GENERAL', {
                    context: { error: 'leftChild undefined' },
                })
            }
            const rightChild = leafIndex + 1 < numLeaves ? at(leaves, leafIndex + 1) : leftChild
            const parentNode = this.createParent(leftChild, rightChild)
            newLayer.push(parentNode.hash)
            parents.push(parentNode)
            leafIndex += 2
        }
        this.layers.push(newLayer)

        return this.buildMerkleTree(parents)
    }

    createParent(leftChild: MerkleNode, rightChild: MerkleNode): MerkleNode {
        const parent = new MerkleNode(hexHashArray([leftChild.hash, rightChild.hash]))
        leftChild.parent = parent.hash
        rightChild.parent = parent.hash
        return parent
    }

    proof(leafHash: MerkleLeaf): MerkleProof {
        const proofTree: MerkleProofLayer[] = []
        let layerNum = 0
        while (layerNum < this.layers.length - 1) {
            const layer = this.layers[layerNum]
            if (layer === undefined) {
                throw new ProsopoError('DATASET.MERKLE_ERROR', {
                    context: {
                        error: 'layer undefined',
                        failedFuncName: this.proof.name,
                        layerNum,
                    },
                })
            }
            const leafIndex = layer.indexOf(leafHash)
            // if layer 0 leaf index is 3, it should be partnered with 2: [L0,L1],[L2,L3],[L3,L4],...
            // layer one pairs looks like [L0L1, L2L3], [L3L4, L5L6],...etc
            let partnerIndex = leafIndex % 2 && leafIndex > 0 ? leafIndex - 1 : leafIndex + 1
            // if there are an odd number of leaves in the layer, the last leaf is duplicated
            if (partnerIndex > layer.length - 1) {
                partnerIndex = leafIndex
            }
            const pair: MerkleLeaf[] = [leafHash]
            // determine whether the leaf sits on the left or the right of its partner
            const partner = at(layer, partnerIndex)
            if (partnerIndex > leafIndex) {
                pair.push(partner)
            } else {
                pair.unshift(partner)
            }
            proofTree.push([at(pair, 0), at(pair, 1)])
            layerNum += 1
            leafHash = hexHashArray(pair)
        }
        const last = at(this.layers, this.layers.length - 1)
        return [...proofTree, [at(last, 0)]]
    }
}

export function verifyProof(leaf: MerkleLeaf, proof: MerkleProof): boolean {
    try {
        if (at(proof, 0).indexOf(leaf) === -1) {
            return false
        }
        for (const [layerIndex, layer] of proof.entries()) {
            leaf = hexHashArray(layer)
            if (at(proof, layerIndex + 1).indexOf(leaf) === -1) {
                return false
            }
            const last = at(proof, proof.length - 1)
            if (leaf === at(last, 0)) {
                return true
            }
        }
        return false
    } catch (err) {
        return false
    }
}
