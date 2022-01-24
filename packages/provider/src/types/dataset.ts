// TODO this should be implemented as a Mongoose Schema if mongoDB is to be used.
//     or should it? https://www.mongodb.com/developer/article/mongoose-versus-nodejs-driver/
export type Hash = string

// may want to use IPFS or Hashlinks on files to have proof of integrity
// https://datatracker.ietf.org/doc/html/draft-sporny-hashlink

type MerkleLeaf = {
    hash: Hash,
    leaves: [MerkleLeaf | Hash] // Hash is the CaptchaId which means it is a leaf with the captcha, solution and salt as the leaves
}
