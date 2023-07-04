"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyProof = exports.CaptchaMerkleTree = void 0;
var common_1 = require("@prosopo/common");
var MerkleNode = /** @class */ (function () {
    function MerkleNode(hash) {
        this.hash = hash;
        this.parent = null;
    }
    return MerkleNode;
}());
var CaptchaMerkleTree = /** @class */ (function () {
    function CaptchaMerkleTree() {
        this.leaves = [];
        this.layers = [];
    }
    CaptchaMerkleTree.prototype.build = function (leaves) {
        // allow rebuild
        if (this.layers.length) {
            this.layers = [];
        }
        var layerZero = [];
        for (var _i = 0, leaves_1 = leaves; _i < leaves_1.length; _i++) {
            var leaf = leaves_1[_i];
            var node = new MerkleNode(leaf);
            this.leaves.push(node);
            layerZero.push(node.hash);
        }
        this.layers.push(layerZero);
        this.root = this.buildMerkleTree(this.leaves);
    };
    CaptchaMerkleTree.prototype.buildMerkleTree = function (leaves) {
        // Builds the Merkle tree from a list of leaves. In case of an odd number of leaves, the last leaf is duplicated.
        var numLeaves = leaves.length;
        if (numLeaves === 1) {
            return leaves[0];
        }
        var parents = [];
        var leafIndex = 0;
        var newLayer = [];
        while (leafIndex < numLeaves) {
            var leftChild = leaves[leafIndex];
            var rightChild = leafIndex + 1 < numLeaves ? leaves[leafIndex + 1] : leftChild;
            var parentNode = this.createParent(leftChild, rightChild);
            newLayer.push(parentNode.hash);
            parents.push(parentNode);
            leafIndex += 2;
        }
        this.layers.push(newLayer);
        return this.buildMerkleTree(parents);
    };
    CaptchaMerkleTree.prototype.createParent = function (leftChild, rightChild) {
        var parent = new MerkleNode((0, common_1.hexHashArray)([leftChild.hash, rightChild.hash]));
        leftChild.parent = parent;
        rightChild.parent = parent;
        return parent;
    };
    CaptchaMerkleTree.prototype.proof = function (leafHash) {
        var proofTree = [];
        var layerNum = 0;
        while (layerNum < this.layers.length - 1) {
            var leafIndex = this.layers[layerNum].indexOf(leafHash);
            // if layer 0 leaf index is 3, it should be partnered with 2: [L0,L1],[L2,L3],[L3,L4],...
            // layer one pairs looks like [L0L1, L2L3], [L3L4, L5L6],...etc
            var partnerIndex = leafIndex % 2 && leafIndex > 0 ? leafIndex - 1 : leafIndex + 1;
            // if there are an odd number of leaves in the layer, the last leaf is duplicated
            if (partnerIndex > this.layers[layerNum].length - 1) {
                partnerIndex = leafIndex;
            }
            var pair = [leafHash];
            var layer = this.layers[layerNum];
            // determine whether the leaf sits on the left or the right of its partner
            if (partnerIndex > leafIndex) {
                pair.push(layer[partnerIndex]);
            }
            else {
                pair.unshift(layer[partnerIndex]);
            }
            proofTree.push([pair[0], pair[1]]);
            layerNum += 1;
            leafHash = (0, common_1.hexHashArray)(pair);
        }
        return __spreadArray(__spreadArray([], proofTree, true), [[this.layers[this.layers.length - 1][0]]], false);
    };
    return CaptchaMerkleTree;
}());
exports.CaptchaMerkleTree = CaptchaMerkleTree;
function verifyProof(leaf, proof) {
    try {
        if (proof[0].indexOf(leaf) === -1) {
            return false;
        }
        for (var _i = 0, _a = proof.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], layerIndex = _b[0], layer = _b[1];
            leaf = (0, common_1.hexHashArray)(layer);
            if (proof[layerIndex + 1].indexOf(leaf) === -1) {
                return false;
            }
            if (leaf === proof[proof.length - 1][0]) {
                return true;
            }
        }
        return false;
    }
    catch (err) {
        return false;
    }
}
exports.verifyProof = verifyProof;
