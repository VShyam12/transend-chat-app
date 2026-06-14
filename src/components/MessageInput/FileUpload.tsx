import { useState } from 'react'
import { PaperClipIcon } from '@heroicons/react/24/outline'

interface FileUploadProps {
  onFileSelect: (file: File) => void
}

export const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }

    onFileSelect(file)
  }

  return (
    <div className="relative">
      <label className="cursor-pointer">
        <input
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileChange}
        />
        <PaperClipIcon className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" />
      </label>

      {previewUrl && (
        <div className="absolute bottom-full mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-[200px] max-h-[200px] rounded"
          />
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}