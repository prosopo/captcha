import mongoose, { Schema } from 'mongoose'

export interface UserInterface {
    id: number
    email: string
    name: string
    password: string
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
})

export default UserSchema
