import { useEffect, useMemo, useRef, useState } from 'react'
import { PaperAirplaneIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { connectSocket } from '../utils/socket'
import api from '../utils/api'

import type { Message } from '../types'

type ChatInputProps = {
  recipientIds: string[]
  primaryRecipientId: string
  groupId?: string
  currentUserId: string
  currentLanguage: string
  isGroupChat?: boolean
  onMessageSent: (message: Message) => void
}

const ChatInput = ({
  recipientIds,
  primaryRecipientId,
  groupId = '',
  currentUserId,
  currentLanguage,
  isGroupChat = false,
  onMessageSent,
}: ChatInputProps) => {
  const [message, setMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioPreviewRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<number | null>(null)

  const socket = useMemo(() => connectSocket(), [])

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  const stopAudioPlayback = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause()
      audioPreviewRef.current.currentTime = 0
    }
    setIsAudioPlaying(false)
  }

  const clearAudioRecording = () => {
    clearRecordingTimer()
    stopAudioPlayback()

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl)
    }

    mediaRecorderRef.current = null
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
    setAudioBlob(null)
    setAudioPreviewUrl(null)
    setRecordingSeconds(0)
    setIsRecording(false)
  }

  useEffect(() => () => {
    clearRecordingTimer()
    stopAudioPlayback()
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl)
    }
  }, [audioPreviewUrl, previewUrl])

  const emitTyping = (isTyping: boolean) => {
    try {
      if (isGroupChat && groupId) {
        socket.emit('groupTyping', { groupId, isTyping })
        return
      }

      if (!primaryRecipientId) return

      console.log('[ChatInput] emitting typing', { receiverId: primaryRecipientId, isTyping })
      socket.emit('typing', { receiverId: primaryRecipientId, isTyping })
    } catch {
      // ignore
    }
  }

  const emitStopTyping = () => {
    try {
      if (isGroupChat && groupId) {
        socket.emit('groupStopTyping', { groupId })
        return
      }

      if (!primaryRecipientId) return

      socket.emit('stopTyping', { receiverId: primaryRecipientId })
    } catch {
      // ignore
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (isRecording || audioPreviewUrl) {
      clearAudioRecording()
    }

    setSelectedFile(file)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    const nextPreview = URL.createObjectURL(file)
    setPreviewUrl(nextPreview)
  }

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const startRecording = async () => {
    if (isGroupChat) {
      return
    }

    if (isRecording) {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      window.alert('Voice recording is not supported in this browser.')
      return
    }

    try {
      clearAudioRecording()
      clearSelectedFile()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorderOptions = MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : undefined
      const recorder = new MediaRecorder(stream, recorderOptions)
      const chunks: BlobPart[] = []

      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      setRecordingSeconds(0)
      setIsRecording(true)

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => seconds + 1)
      }, 1000)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        clearRecordingTimer()
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
        setIsRecording(false)

        const blob = new Blob(chunks, { type: 'audio/webm' })
        if (blob.size === 0) {
          setAudioBlob(null)
          setAudioPreviewUrl(null)
          return
        }

        stopAudioPlayback()
        const nextPreviewUrl = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioPreviewUrl(nextPreviewUrl)
      }

      recorder.start()
    } catch (error) {
      clearRecordingTimer()
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
      setIsRecording(false)
      console.error('Failed to start audio recording', error)
      window.alert('Microphone access is required to record a voice message.')
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'recording') {
      return
    }

    recorder.stop()
  }

  const toggleRecording = () => {
    if (isGroupChat) {
      return
    }

    if (isRecording) {
      stopRecording()
      return
    }

    void startRecording()
  }

  const uploadImage = async () => {
    if (!selectedFile) {
      return null
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('receiverId', primaryRecipientId || recipientIds[0] || '')
    formData.append('message', message.trim())

    const response = await api.post('/api/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.data
  }

  const uploadAudio = async (messageText: string) => {
    if (!audioBlob) {
      return null
    }

    const receiverId = primaryRecipientId || recipientIds[0] || currentUserId
    const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('receiverId', receiverId)
    formData.append('message', messageText)

    const response = await api.post('/api/messages/upload-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.data
  }

  const sendMessage = async () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage && !selectedFile && !audioBlob) {
      return
    }

    setIsSending(true)
    try {
      const clientMessageId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      if (isGroupChat) {
        if (!groupId) {
          return
        }

        const formData = new FormData()
        formData.append('message', trimmedMessage)
        formData.append('clientMessageId', clientMessageId)
        formData.append('language', currentLanguage)

        if (selectedFile) {
          formData.append('file', selectedFile)
        }

        const response = await api.post(`/api/groups/${groupId}/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        onMessageSent(response.data?.message)
      } else {
        const receiverId = primaryRecipientId || recipientIds[0] || currentUserId
        if (audioBlob) {
          const uploadResponse = await uploadAudio(trimmedMessage || 'Voice message')
          const sentMessage = uploadResponse?.message
          if (sentMessage) {
            onMessageSent(sentMessage)
          }
        } else if (selectedFile) {
          const uploadResponse = await uploadImage()
          const fileUrl = String(uploadResponse?.fileUrl || '')
          const imageUrl = String(uploadResponse?.message?.imageUrl || uploadResponse?.imageUrl || fileUrl || '') || null
          const optimisticMessage: Message = {
            id: clientMessageId,
            clientMessageId,
            text: trimmedMessage,
            senderId: currentUserId,
            receiverId,
            timestamp: new Date(),
            status: 'sent',
            language: currentLanguage,
            imageUrl,
            reactions: [],
          }

          onMessageSent({
            ...optimisticMessage,
            id: String(uploadResponse?.message?.id || uploadResponse?.message?._id || clientMessageId),
            imageUrl,
            translated: uploadResponse?.message?.translated ?? optimisticMessage.translated,
          })
        } else {
          const optimisticMessage: Message = {
            id: clientMessageId,
            clientMessageId,
            text: trimmedMessage,
            senderId: currentUserId,
            receiverId,
            timestamp: new Date(),
            status: 'sent',
            language: currentLanguage,
            reactions: [],
          }

          onMessageSent(optimisticMessage)

          socket.emit('sendMessage', {
            receiverId,
            message: trimmedMessage,
            language: currentLanguage,
            clientMessageId,
          })
        }
      }

      emitStopTyping()
      setMessage('')
      clearSelectedFile()
      clearAudioRecording()
      inputRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void sendMessage()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  const toggleAudioPlayback = async () => {
    const audioElement = audioPreviewRef.current
    if (!audioElement) {
      return
    }

    if (isAudioPlaying) {
      audioElement.pause()
      setIsAudioPlaying(false)
      return
    }

    try {
      await audioElement.play()
      setIsAudioPlaying(true)
    } catch {
      setIsAudioPlaying(false)
    }
  }

  const handleSendAudioPreview = () => {
    void sendMessage()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
      {audioPreviewUrl && !isRecording ? (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <audio
            ref={audioPreviewRef}
            src={audioPreviewUrl}
            preload="metadata"
            onEnded={() => setIsAudioPlaying(false)}
            className="hidden"
          />
          <button
            type="button"
            onClick={toggleAudioPlayback}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-500"
            title={isAudioPlaying ? 'Pause preview' : 'Play preview'}
          >
            <span className="text-lg leading-none">{isAudioPlaying ? '⏸' : '▶'}</span>
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Voice message ready to send</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Recorded {Math.max(recordingSeconds, 1)}s</p>
          </div>
          <button
            type="button"
            onClick={handleSendAudioPreview}
            disabled={isSending}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            Send
          </button>
          <button
            type="button"
            onClick={clearAudioRecording}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Discard recording"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ) : previewUrl && (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <img src={previewUrl} alt="Upload preview" className="h-16 w-16 rounded-xl object-cover" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Image ready to send</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedFile?.name}</p>
          </div>
          <button type="button" onClick={clearSelectedFile} className="rounded-full p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isRecording}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Attach image"
        >
          <PaperClipIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={toggleRecording}
          disabled={isGroupChat}
          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors ${isRecording ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'} disabled:cursor-not-allowed disabled:opacity-50`}
          title={isGroupChat ? 'Voice messages are not available in group chats yet' : (isRecording ? 'Stop recording' : 'Record voice message')}
        >
          <span className="text-lg leading-none">🎤</span>
        </button>

        <div className="flex-1 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
          <textarea
            ref={inputRef}
            value={message}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setMessage(nextValue)

                  if (nextValue.length === 0) {
                    emitStopTyping()
                    return
                  }

                  emitTyping(true)
                }}
            onKeyDown={handleKeyDown}
            placeholder={isGroupChat ? 'Message group...' : 'Type a message...'}
            rows={1}
            className="w-full resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
          {isRecording && (
            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>Recording</span>
              <span>{`${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`}</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSending || isRecording || (!message.trim() && !selectedFile && !audioBlob)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#4f46e5' }}
        >
          <PaperAirplaneIcon className="h-5 w-5 rotate-90" />
        </button>
      </div>
    </form>
  )
}

export { ChatInput }