// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
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
// TODO this should be implemented as a Mongoose Schema if mongoDB is to be used.
//     or should it? https://www.mongodb.com/developer/article/mongoose-versus-nodejs-driver/
export type Hash = string

// may want to use IPFS or Hashlinks on files to have proof of integrity
// https://datatracker.ietf.org/doc/html/draft-sporny-hashlink

type MerkleLeaf = {
    hash: Hash,
    leaves: [MerkleLeaf | Hash] // Hash is the CaptchaId which means it is a leaf with the captcha, solution and salt as the leaves
}
