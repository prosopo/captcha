import mongoose from 'mongoose'

const captchaEventSchema = new mongoose.Schema({
    touchEvents: [
        {
            x: Number,
            y: Number,
            timestamp: Number,
        },
    ],
    mouseEvents: [
        {
            x: Number,
            y: Number,
            timestamp: Number,
        },
    ],
    keyboardEvents: [
        {
            key: String,
            timestamp: Number,
            isShiftKey: Boolean,
            isCtrlKey: Boolean,
        },
    ],
    captchaId: String,
})

interface DBConfig {
    uri: string
    dbName: string
}

const CaptchaEvent = mongoose.model('CaptchaEvent', captchaEventSchema)

const connectToDatabase = ({ uri, dbName }: DBConfig) => {
    mongoose
        .connect(uri)
        .then(() => console.log('Connected to MongoDB'))
        .catch((err) => console.error('Error connecting to MongoDB:', err))
}

module.exports = { CaptchaEvent, connectToDatabase }
