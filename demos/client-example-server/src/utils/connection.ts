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
import { AutoIncrementID, AutoIncrementIDOptions } from '@typegoose/auto-increment'
import UserSchema from '../models/user.js'
import mongoose, { Connection } from 'mongoose'

function connectionFactory(uri: string): Connection {
    const conn = mongoose.createConnection(uri)
    if (!conn.models.user) {
        UserSchema.plugin(AutoIncrementID, { field: 'id' } as AutoIncrementIDOptions)
        conn.model('User', UserSchema)
    }
    return conn
}
export default connectionFactory
