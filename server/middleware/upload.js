import multer from 'multer'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

// Store uploads under server/uploads
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (_req, file, cb) {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`
    cb(null, safeName)
  }
})

const fileFilter = function (_req, file, cb) {
  const allowedAudioMimeTypes = new Set([
    'audio/webm',
    'audio/mp3',
    'audio/wav',
    'audio/mpeg',
  ])

  // Allow common image types plus audio uploads used for voice messages.
  if (file.mimetype.startsWith('image/') || allowedAudioMimeTypes.has(file.mimetype) || file.mimetype === 'application/octet-stream') {
    cb(null, true)
  } else {
    cb(new Error('Only image and audio uploads are allowed'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

export default upload
