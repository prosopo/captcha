import UserSchema from '../models/user'
import mongoose, { Connection } from 'mongoose'
import mongoose_sequence from 'mongoose-sequence'

function connectionFactory(uri: string): Connection {
    const conn = mongoose.createConnection(uri)
    const AutoIncrement = mongoose_sequence(conn)
    if (!conn.models.user) {
        UserSchema.plugin(AutoIncrement, { id: 'user_id_counter', inc_field: 'id' })
        conn.model('User', UserSchema)
    }
    return conn
}
export default connectionFactory
