import { useState } from 'react';
import { PaperClipIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    onFileSelect(file);
  };

  const clearPreview = () => {
    setPreview(null);
  };

  return (
    <div className="relative">
      <label className="cursor-pointer">
        <input
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx"
        />
        <PaperClipIcon className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" />
      </label>

      {preview && (
        <div className="absolute bottom-full mb-2 right-0 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 max-w-[200px]">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full h-auto rounded"
            />
            <button
              onClick={clearPreview}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
              title="Remove"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};