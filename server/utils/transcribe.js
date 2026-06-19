import Groq from 'groq-sdk'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function transcribeAudio(filePath) {
    console.log('Transcribing audio file:', filePath)

    try {
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-large-v3',
            response_format: 'json',
        })

        const text = transcription?.text?.trim()
        console.log('Transcription result:', text)
        return text || null
    } catch (error) {
        console.error('Transcription error:', error.message)
        return null
    }
}

export { transcribeAudio }