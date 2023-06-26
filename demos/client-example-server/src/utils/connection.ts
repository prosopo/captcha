import { AutoIncrementID, AutoIncrementIDOptions } from '@typegoose/auto-increment'
import UserSchema from '../models/user'
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
