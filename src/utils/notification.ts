let audioUnlocked = false

// Call this on any user gesture
export function unlockAudio() {
  audioUnlocked = true
}

export function playNotificationSound() {
  if (!audioUnlocked) return

  try {
    const context = new (window.AudioContext ||
      (window as any).webkitAudioContext)()

    const buffer = context.createBuffer(1, context.sampleRate * 0.3,
      context.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      data[i] = Math.sin(2 * Math.PI * 880 * i / context.sampleRate) *
        Math.exp(-3 * i / buffer.length)
    }

    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    source.start()

    setTimeout(() => context.close(), 1000)
  } catch(e) {
    console.warn('Sound failed:', e)
  }
}

const PERMISSION_BANNER_DISMISSED_KEY = 'transend-notification-banner-dismissed'
const UNREAD_TITLE_BASE = 'Transend - Chat Beyond Language'

let originalDocumentTitle: string | null = null

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if ('Notification' in window &&
      Notification.permission === 'default') {
    return await Notification.requestPermission()
  }

  if ('Notification' in window) {
    return Notification.permission
  }

  return 'unsupported'
}

export function showBrowserNotification(titleOrPayload: string | { title: string, body: string }, body?: string) {
  if ('Notification' in window &&
      Notification.permission === 'granted') {
    if (typeof titleOrPayload === 'string') {
      new Notification(titleOrPayload, { body: (body || '').substring(0, 50) })
      return
    }

    new Notification(titleOrPayload.title, { body: titleOrPayload.body.substring(0, 50) })
  }
}

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

export const shouldShowNotificationPermissionBanner = (): boolean => {
  if (getNotificationPermission() === 'unsupported' || getNotificationPermission() === 'granted') {
    return false
  }

  return localStorage.getItem(PERMISSION_BANNER_DISMISSED_KEY) !== 'true'
}

export const dismissNotificationPermissionBanner = () => {
  localStorage.setItem(PERMISSION_BANNER_DISMISSED_KEY, 'true')
}

export const updatePageTitleWithUnread = (unreadCount: number) => {
  if (typeof document === 'undefined') {
    return
  }

  if (originalDocumentTitle === null) {
    originalDocumentTitle = document.title
  }

  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${UNREAD_TITLE_BASE}`
    return
  }

  document.title = originalDocumentTitle
}

export const resetPageTitle = () => {
  if (typeof document === 'undefined' || originalDocumentTitle === null) {
    return
  }

  document.title = originalDocumentTitle
}