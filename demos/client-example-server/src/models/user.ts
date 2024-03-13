// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import mongoose, { Schema } from 'mongoose'

export interface UserInterface {
    id: number
    email: string
    name: string
    password: string
    salt: string
}

const UserSchema = new Schema<UserInterface>({
    email: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    name: {
        type: mongoose.SchemaTypes.String,
    },
    password: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    id: {
        type: mongoose.SchemaTypes.Number,
    },
    salt: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
})

export default UserSchema
