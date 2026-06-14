import Groq from 'groq-sdk'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function translateText(text, targetLanguage) {
  console.log('Translating to:', targetLanguage, '| Text:', text)

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a translation assistant. Translate the given text to the requested language. Return ONLY the translated text, nothing else. No explanations, no quotes, no punctuation changes, no notes.'
        },
        {
          role: 'user',
          content: `Translate to ${targetLanguage}: ${text}`
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    })

    const translated = completion.choices[0]?.message?.content?.trim()
    console.log('Translation result:', translated)
    return translated || null

  } catch (error) {
    console.error('Translation error:', error.message)
    return null
  }
}

export { translateText }
