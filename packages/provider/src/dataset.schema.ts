import { Schema } from 'mongoose';
import { Hash } from './prosopo.d';

// TODO this should be implemented as a Mongoose Schema if mongoDB is to be used

// may want to use IPFS or Hashlinks on files to have proof of integrity
// https://datatracker.ietf.org/doc/html/draft-sporny-hashlink
type Url = string;

type CaptchaCollectionSchema = {
    datasetId: string,
    captchaId: Hash,
    captcha: [Url],
    solution?: [number],
    salt?: string,
    merkleTreeProof?: [Hash]
}

type MerkleLeaf = {
    hash: Hash,
    leaves: [MerkleLeaf | Hash] // Hash is the CaptchaId which means it is a leaf with the captcha, solution and salt as the leaves
}

// May be redundant, as data exists in the CaptchaCollection
// Maps out the entire merkle tree for each dataset
type DatasetCollectionSchema = {
    datasetId: string,
    rootHash: MerkleLeaf
}
