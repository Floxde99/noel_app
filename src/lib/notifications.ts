// Notification utilities for browser and mobile push notifications

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported')
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Check if notifications are enabled
export function areNotificationsEnabled(): boolean {
  return (
    'Notification' in window &&
    Notification.permission === 'granted'
  )
}

// Send a browser notification
export function sendBrowserNotification(options: NotificationOptions): Notification | null {
  if (!areNotificationsEnabled()) {
    return null
  }

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || '/favicon/apple-touch-icon.png',
    badge: options.badge || '/favicon/favicon-32.png',
    tag: options.tag,
    data: options.data,
    requireInteraction: false,
    silent: false,
  })

  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close()
  }, 5000)

  // Handle click to focus window
  notification.onclick = (event) => {
    event.preventDefault()
    window.focus()
    notification.close()
    
    // Navigate if data contains URL
    if (options.data?.url) {
      window.location.href = options.data.url
    }
  }

  return notification
}

// Notification for new chat message
export function notifyNewMessage(userName: string, message: string, eventId: string) {
  sendBrowserNotification({
    title: `💬 ${userName}`,
    body: message,
    tag: `chat-${eventId}`,
    data: { url: `/events/${eventId}?tab=chat`, type: 'chat' },
  })
}

// Notification for new poll
export function notifyNewPoll(pollTitle: string, eventId: string) {
  sendBrowserNotification({
    title: '📊 Nouveau sondage',
    body: pollTitle,
    tag: `poll-${eventId}`,
    data: { url: `/events/${eventId}?tab=polls`, type: 'poll' },
  })
}

// Notification for new task
export function notifyNewTask(taskTitle: string, eventId: string) {
  sendBrowserNotification({
    title: '✅ Nouvelle tâche',
    body: taskTitle,
    tag: `task-${eventId}`,
    data: { url: `/events/${eventId}?tab=tasks`, type: 'task' },
  })
}

// Notification for task assigned
export function notifyTaskAssigned(taskTitle: string, eventId: string) {
  sendBrowserNotification({
    title: '🎯 Tâche assignée',
    body: `Vous avez été assigné à : ${taskTitle}`,
    tag: `task-assigned-${eventId}`,
    data: { url: `/events/${eventId}?tab=tasks`, type: 'task' },
  })
}

// Notification for poll closed
export function notifyPollClosed(pollTitle: string, eventId: string) {
  sendBrowserNotification({
    title: '🔒 Sondage fermé',
    body: `Résultats disponibles : ${pollTitle}`,
    tag: `poll-closed-${eventId}`,
    data: { url: `/events/${eventId}?tab=polls`, type: 'poll' },
  })
}

// Check if user is viewing the tab (to avoid notifying when already looking)
export function isTabVisible(): boolean {
  return !document.hidden
}
