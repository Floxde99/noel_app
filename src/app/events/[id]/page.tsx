"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/components/providers/auth-provider'
import { useSocket } from '@/components/providers/socket-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { VoterAvatars } from '@/components/ui/voter-avatars'
import { formatDate, formatTime, cn } from '@/lib/utils'
import { 
  requestNotificationPermission, 
  areNotificationsEnabled,
  notifyNewMessage,
  notifyNewPoll,
  notifyNewTask,
  isTabVisible
} from '@/lib/notifications'
import { 
  ArrowLeft,
  Calendar, 
  MapPin, 
  Users, 
  ChefHat,
  MessageCircle,
  ClipboardList,
  BarChart3,
  Loader2,
  Copy,
  ExternalLink,
  Plus,
  Check,
  X,
  Send,
  Sparkles,
  Gift,
  Share2,
  Download,
  Printer
} from 'lucide-react'

// Types
interface User {
  id: string
  name: string
  avatar?: string
}

interface Contribution {
  id: string
  title: string
  description?: string
  category?: string
  quantity: number
  budget?: number | null
  status: 'PLANNED' | 'CONFIRMED' | 'BROUGHT'
  assignee?: User
  imageUrl?: string
}

interface PollOption {
  id: string
  label: string
  voteCount: number
  voters?: User[]
}

interface Poll {
  id: string
  title: string
  description?: string
  type: 'SINGLE' | 'MULTIPLE'
  isClosed: boolean
  autoClose?: string
  imageUrl?: string
  createdBy?: User
  createdById?: string
  options: PollOption[]
  hasVoted: boolean
  userVotes: string[]
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  assignee?: User
  dueDate?: string
  isPrivate?: boolean
  createdBy?: User
}

interface MenuIngredient {
  id: string
  name: string
  details?: string | null
  contribution?: Contribution | null
}

interface MenuRecipe {
  id: string
  title: string
  description?: string | null
  ingredients: MenuIngredient[]
}

interface ChatMessage {
  id: string
  content: string
  createdAt: string
  user: User
  media?: ChatMessageMedia[]
}

interface ChatMessageMedia {
  id: string
  imageUrl: string
}

interface Event {
  id: string
  name: string
  description?: string
  date: string
  endDate?: string
  location?: string
  mapUrl?: string
  status: 'DRAFT' | 'OPEN' | 'CLOSED'
  bannerImage?: string
  participants: User[]
  contributions: Contribution[]
  menuRecipes: MenuRecipe[]
  polls: Poll[]
  tasks: Task[]
  chatMessages: ChatMessage[]
  eventCodes?: { code: string }[]
  counts?: {
    eventUsers: number
    contributions: number
    polls: number
    tasks: number
    chatMessages: number
    menuRecipes: number
  }
}

export default function EventPage() {
  const params = useParams()
  const rawEventId = params?.id
  const eventId = Array.isArray(rawEventId) ? rawEventId[0] : rawEventId
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const { socket, joinEvent, leaveEvent } = useSocket()
  const { toast } = useToast()
  
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'contributions' | 'menu' | 'polls' | 'tasks' | 'chat'>('contributions')

  const hasEvent = event !== null
  const [isContribDialogOpen, setIsContribDialogOpen] = useState(false)
  const [sortCategory, setSortCategory] = useState<string | null>(null)
  const [editingContribId, setEditingContribId] = useState<string | null>(null)
  const [editingContrib, setEditingContrib] = useState({ title: '', description: '', category: 'plat', quantity: 1, budget: '' })
  const [selectedContribForDetail, setSelectedContribForDetail] = useState<Contribution | null>(null)
  
  // Form states
  const [newContribution, setNewContribution] = useState({ title: '', description: '', category: 'plat', quantity: 1, budget: '', imageUrl: '', contribImagePreview: '' })
  const [newTask, setNewTask] = useState({ title: '', description: '', isPrivate: false, dueDate: '' })
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState({ title: '', description: '', dueDate: '' })
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false)
  const [newPoll, setNewPoll] = useState({ title: '', description: '', type: 'SINGLE', options: ['', ''], imageUrl: '', pollImagePreview: '', autoClose: '' })
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false)
  const [editingPollId, setEditingPollId] = useState<string | null>(null)
  const [editingPoll, setEditingPoll] = useState({ title: '', description: '', type: 'SINGLE', options: ['', ''], imageUrl: '', pollImagePreview: '', autoClose: '' })
  const [isEditPollDialogOpen, setIsEditPollDialogOpen] = useState(false)
    const [selectedPollImageId, setSelectedPollImageId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [chatImageUrls, setChatImageUrls] = useState<string[]>([])
  const [chatImagePreviews, setChatImagePreviews] = useState<string[]>([])
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string[]>>({})
  const [newRecipe, setNewRecipe] = useState({ title: '', description: '' })
  const [newIngredient, setNewIngredient] = useState<Record<string, { name: string; details: string }>>({})
  const [claimingIngredientId, setClaimingIngredientId] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [lastMessageCount, setLastMessageCount] = useState(0)
  const [lastPollCount, setLastPollCount] = useState(0)
  const [lastTaskCount, setLastTaskCount] = useState(0)

  const loadedTabsRef = useRef<Record<'contributions' | 'menu' | 'polls' | 'tasks' | 'chat', boolean>>({
    contributions: false,
    menu: false,
    polls: false,
    tasks: false,
    chat: false,
  })

  const [loadingTabs, setLoadingTabs] = useState<Record<'contributions' | 'menu' | 'polls' | 'tasks' | 'chat', boolean>>({
    contributions: false,
    menu: false,
    polls: false,
    tasks: false,
    chat: false,
  })

  const countsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Request notification permission on mount
  useEffect(() => {
    const checkNotifications = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await requestNotificationPermission()
        setNotificationsEnabled(permission === 'granted')
      } else {
        setNotificationsEnabled(areNotificationsEnabled())
      }
    }
    checkNotifications()
  }, [])
  // Fetch event data - optimized to load minimal data first, then specific sections
  const fetchEventMinimal = useCallback(async () => {
    try {
      if (!eventId) return
      
      // Load minimal event info + participants (both needed at page load)
      const [minimalRes, participantsRes] = await Promise.all([
        fetch(`/api/events/${eventId}/minimal`, { credentials: 'include' }),
        fetch(`/api/events/${eventId}/participants`, { credentials: 'include' }),
      ])

      if (!minimalRes.ok) {
        if (minimalRes.status === 401 || minimalRes.status === 403) {
          router.push('/dashboard')
        }
        return null
      }

      const minimalData = await minimalRes.json()
      const participantsData = participantsRes.ok ? await participantsRes.json() : { participants: [] }

      return {
        ...minimalData.event,
        participants: participantsData.participants || [],
      }
    } catch (error) {
      console.error('Failed to fetch minimal event:', error)
      return null
    }
  }, [eventId, router])

  const refreshCounts = useCallback(async () => {
    if (!eventId) return
    try {
      const res = await fetch(`/api/events/${eventId}/minimal`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const nextCounts = data?.event?.counts
      if (!nextCounts) return

      setEvent((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          // keep existing loaded arrays; just update metadata + counts
          name: data.event.name ?? prev.name,
          description: data.event.description ?? prev.description,
          date: data.event.date ?? prev.date,
          endDate: data.event.endDate ?? prev.endDate,
          location: data.event.location ?? prev.location,
          mapUrl: data.event.mapUrl ?? prev.mapUrl,
          status: data.event.status ?? prev.status,
          bannerImage: data.event.bannerImage ?? prev.bannerImage,
          counts: nextCounts,
        }
      })
    } catch {
      // ignore
    }
  }, [eventId])

  const scheduleCountsRefresh = useCallback(() => {
    if (countsRefreshTimerRef.current) {
      clearTimeout(countsRefreshTimerRef.current)
    }
    countsRefreshTimerRef.current = setTimeout(() => {
      refreshCounts()
    }, 300)
  }, [refreshCounts])

  // Fetch specific section based on active tab
  const fetchEventSection = useCallback(async (section: 'contributions' | 'menu' | 'polls' | 'tasks' | 'chat') => {
    try {
      if (!eventId) return null
      
      const endpoints: Record<string, string> = {
        'contributions': `/api/events/${eventId}/contributions`,
        'menu': `/api/events/${eventId}/menu`,
        'polls': `/api/events/${eventId}/polls`,
        'tasks': `/api/events/${eventId}/tasks`,
        'chat': `/api/events/${eventId}/messages?limit=50`,
      }

      const response = await fetch(endpoints[section], {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        return data
      }
      return null
    } catch (error) {
      console.error(`Failed to fetch ${section}:`, error)
      return null
    }
  }, [eventId])

  // Initial fetch - load minimal data
  const fetchEvent = useCallback(async () => {
    try {
      if (!eventId) return
      
      // Load minimal event data first (fast)
      const minimalEvent = await fetchEventMinimal()
      if (!minimalEvent) return

      // Create base event object with minimal data
      const newEvent = {
        ...minimalEvent,
        participants: minimalEvent.participants || [],
        contributions: [],
        menuRecipes: [],
        polls: [],
        tasks: [],
        chatMessages: [],
      }

      loadedTabsRef.current = {
        contributions: false,
        menu: false,
        polls: false,
        tasks: false,
        chat: false,
      }

      setEvent(newEvent)
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to fetch event:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'événement',
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  }, [eventId, toast, fetchEventMinimal])

  // Fetch section data when tab changes
  const loadTabData = useCallback(
    async (tab: 'contributions' | 'menu' | 'polls' | 'tasks' | 'chat', opts?: { force?: boolean }) => {
    if (!eventId) return

    // Avoid refetching the same tab repeatedly
    if (!opts?.force && loadedTabsRef.current[tab]) return

    setLoadingTabs(prev => ({ ...prev, [tab]: true }))

    const sectionData = await fetchEventSection(tab)
    if (!sectionData) {
      setLoadingTabs(prev => ({ ...prev, [tab]: false }))
      return
    }

    loadedTabsRef.current[tab] = true

    setEvent((prev) => {
      if (!prev) return prev
      const next = { ...prev }

      if (tab === 'contributions') {
        next.contributions = sectionData.contributions
      } else if (tab === 'menu') {
        next.menuRecipes = sectionData.menuRecipes
      } else if (tab === 'polls') {
        next.polls = sectionData.polls
      } else if (tab === 'tasks') {
        next.tasks = sectionData.tasks
      } else if (tab === 'chat') {
        next.chatMessages = sectionData.messages
      }

      return next
    })

    if (tab === 'polls') {
      const votes: Record<string, string[]> = {}
      sectionData.polls.forEach((poll: Poll) => {
        votes[poll.id] = poll.userVotes || []
      })
      setSelectedVotes(votes)
    }

    if (tab === 'chat') {
      setLastMessageCount(sectionData.messages.length)
    }

    setLoadingTabs(prev => ({ ...prev, [tab]: false }))
  },
    [eventId, fetchEventSection]
  )

  const invalidateTab = useCallback((tab: 'contributions' | 'menu' | 'polls' | 'tasks' | 'chat') => {
    loadedTabsRef.current[tab] = false
  }, [])

  const refreshActiveTab = useCallback(async (tab: 'contributions' | 'menu' | 'polls' | 'tasks' | 'chat') => {
    invalidateTab(tab)
    await loadTabData(tab, { force: true })
    scheduleCountsRefresh()
  }, [invalidateTab, loadTabData, scheduleCountsRefresh])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated || !eventId) return

    fetchEvent()
    joinEvent(eventId)

    return () => {
      leaveEvent(eventId)
    }
  }, [isAuthenticated, eventId, fetchEvent, joinEvent, leaveEvent])

  // Load data when tab changes
  useEffect(() => {
    if (!eventId) return
    if (!hasEvent) return
    loadTabData(activeTab)
  }, [activeTab, eventId, hasEvent, loadTabData])

  useEffect(() => {
    if (!eventId && !authLoading) {
      router.push('/dashboard')
    }
  }, [eventId, authLoading, router])

  // Socket listeners for real-time updates - optimized to reload only relevant section
  useEffect(() => {
    if (!socket) return

    const handleContributionUpdate = async () => {
      if (activeTab === 'contributions') {
        await refreshActiveTab('contributions')
      } else {
        invalidateTab('contributions')
        scheduleCountsRefresh()
      }
    }

    const handlePollUpdate = async () => {
      if (activeTab === 'polls') {
        await refreshActiveTab('polls')
      } else {
        invalidateTab('polls')
        scheduleCountsRefresh()
      }
    }

    const handleTaskUpdate = async () => {
      if (activeTab === 'tasks') {
        await refreshActiveTab('tasks')
      } else {
        invalidateTab('tasks')
        scheduleCountsRefresh()
      }
    }

    const handleNewMessage = async () => {
      if (activeTab === 'chat') {
        await refreshActiveTab('chat')
      } else {
        invalidateTab('chat')
        scheduleCountsRefresh()
      }
    }

    socket.on('contribution-update', handleContributionUpdate)
    socket.on('poll-update', handlePollUpdate)
    socket.on('task-update', handleTaskUpdate)
    socket.on('new-message', handleNewMessage)

    return () => {
      socket.off('contribution-update')
      socket.off('poll-update')
      socket.off('task-update')
      socket.off('new-message')
    }
  }, [socket, activeTab, invalidateTab, refreshActiveTab, scheduleCountsRefresh])

  // Image upload handlers
  const uploadImage = async (file: File, type: 'contribution' | 'poll' | 'chat'): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('eventId', eventId || '')

    const endpoint = `/api/${type === 'contribution' ? 'contributions' : type === 'poll' ? 'polls' : 'chat'}/upload`
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors du téléchargement')
    }

    const data = await response.json()
    return data.imageUrl
  }

  const handleContributionImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      toast({
        title: 'Téléchargement...',
        description: 'Conversion en WebP en cours',
      })

      const imageUrl = await uploadImage(file, 'contribution')
      setNewContribution({
        ...newContribution,
        imageUrl,
        contribImagePreview: URL.createObjectURL(file),
      })

      toast({
        title: 'Image téléchargée ! ✨',
        description: 'Photo convertie en WebP pour optimiser l\'espace',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de télécharger l\'image',
        variant: 'destructive',
      })
    }
  }

  const handlePollImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      toast({
        title: 'Téléchargement...',
        description: 'Conversion en WebP en cours',
      })

      const imageUrl = await uploadImage(file, 'poll')
      setNewPoll({
        ...newPoll,
        imageUrl,
        pollImagePreview: URL.createObjectURL(file),
      })

      toast({
        title: 'Image téléchargée ! ✨',
        description: 'Photo convertie en WebP pour optimiser l\'espace',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de télécharger l\'image',
        variant: 'destructive',
      })
    }
  }

  const handleChatImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    try {
      const newUrls = [...chatImageUrls]
      const newPreviews = [...chatImagePreviews]

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        toast({
          title: 'Téléchargement...',
          description: `Photo ${i + 1} en cours`,
        })

        const imageUrl = await uploadImage(file, 'chat')
        newUrls.push(imageUrl)
        newPreviews.push(URL.createObjectURL(file))
      }

      setChatImageUrls(newUrls)
      setChatImagePreviews(newPreviews)

      toast({
        title: 'Images téléchargées ! ✨',
        description: 'Photos converties en WebP',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de télécharger les images',
        variant: 'destructive',
      })
    }
  }

  const handleCreateRecipe = async () => {
    if (!eventId) {
      toast({ title: 'Erreur', description: 'Événement introuvable', variant: 'destructive' })
      return
    }

    if (!newRecipe.title.trim()) {
      toast({ title: 'Titre requis', description: 'Ajoutez un nom de recette', variant: 'destructive' })
      return
    }

    const description = newRecipe.description.trim() || undefined

    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          title: newRecipe.title.trim(),
          description,
        }),
      })

      if (res.ok) {
        toast({ title: 'Recette ajoutée', variant: 'success' })
        setNewRecipe({ title: '', description: '' })
        if (activeTab === 'menu') {
          void refreshActiveTab('menu')
        } else {
          invalidateTab('menu')
          scheduleCountsRefresh()
        }
      } else {
        const data = await res.json().catch(() => null)
        toast({ title: 'Erreur', description: data?.error || 'Impossible d’ajouter la recette', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible d’ajouter la recette', variant: 'destructive' })
    }
  }

  const handleAddIngredient = async (recipeId: string) => {
    const form = newIngredient[recipeId] || { name: '', details: '' }
    if (!form.name.trim()) {
      toast({ title: 'Nom requis', description: 'Ajoutez un ingrédient', variant: 'destructive' })
      return
    }

    const details = form.details.trim() || undefined

    try {
      const res = await fetch(`/api/menu/${recipeId}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: form.name.trim(), details }),
      })

      if (res.ok) {
        toast({ title: 'Ingrédient ajouté', variant: 'success' })
        setNewIngredient((prev) => ({ ...prev, [recipeId]: { name: '', details: '' } }))
        if (activeTab === 'menu') {
          void refreshActiveTab('menu')
        } else {
          invalidateTab('menu')
          scheduleCountsRefresh()
        }
      } else {
        const data = await res.json().catch(() => null)
        toast({ title: 'Erreur', description: data?.error || 'Ajout impossible', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Ajout impossible', variant: 'destructive' })
    }
  }

  const handleClaimIngredient = async (ingredientId: string) => {
    setClaimingIngredientId(ingredientId)
    try {
      const res = await fetch(`/api/menu/ingredients/${ingredientId}/claim`, {
        method: 'POST',
        credentials: 'include',
      })

      if (res.ok) {
        toast({ title: 'Pris en charge', description: 'Merci !', variant: 'success' })
        // affects menu immediately; contributions may also be impacted depending on backend logic
        invalidateTab('contributions')
        if (activeTab === 'menu') {
          void refreshActiveTab('menu')
        } else {
          invalidateTab('menu')
          scheduleCountsRefresh()
        }
      } else {
        const data = await res.json().catch(() => null)
        toast({ title: 'Erreur', description: data?.error || 'Impossible de réserver', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de réserver', variant: 'destructive' })
    } finally {
      setClaimingIngredientId(null)
    }
  }

  // Handlers
  const handleAddContribution = async () => {
    if (!eventId) {
      toast({
        title: 'Erreur',
        description: 'Impossible de retrouver l\'événement actif.',
        variant: 'destructive',
      })
      return
    }
    if (!newContribution.title.trim()) {
      toast({
        title: 'Titre requis',
        description: 'Veuillez donner un titre à votre contribution',
        variant: 'destructive',
      })
      return
    }

    const description = newContribution.description.trim() || undefined
    const imageUrl = newContribution.imageUrl || undefined

    try {
      const response = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newContribution.title.trim(),
          description,
          category: newContribution.category,
          quantity: newContribution.quantity || 1,
          budget: newContribution.budget ? parseFloat(newContribution.budget) : undefined,
          imageUrl,
          eventId,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Contribution ajoutée ! 🎉',
          description: 'Merci pour votre participation',
          variant: 'success',
        })
        setNewContribution({ title: '', description: '', category: 'plat', quantity: 1, budget: '', imageUrl: '', contribImagePreview: '' })
        setIsContribDialogOpen(false)
        if (activeTab === 'contributions') {
          void refreshActiveTab('contributions')
        } else {
          invalidateTab('contributions')
          scheduleCountsRefresh()
        }
      } else {
        const data = await response.json().catch(() => ({}))
        toast({
          title: 'Erreur',
          description: data?.error || 'Impossible d\'ajouter la contribution',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur réseau',
        variant: 'destructive',
      })
    }
  }

  const handleDuplicateContribution = async (contrib: Contribution) => {
    if (!eventId) return
    if (!confirm(`Dupliquer "${contrib.title}" ?`)) return

    try {
      const response = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: contrib.title,
          description: contrib.description,
          category: contrib.category,
          imageUrl: contrib.imageUrl,
          eventId,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Contribution dupliquée ! 📋',
          variant: 'success',
        })
        if (activeTab === 'contributions') {
          void refreshActiveTab('contributions')
        } else {
          invalidateTab('contributions')
          scheduleCountsRefresh()
        }
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter la contribution',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateContributionStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/contributions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (activeTab === 'contributions') {
        void refreshActiveTab('contributions')
      } else {
        invalidateTab('contributions')
        scheduleCountsRefresh()
      }
      toast({
        title: 'Statut mis à jour',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour',
        variant: 'destructive',
      })
    }
  }

  const handleEditContribution = (contrib: Contribution) => {
    setEditingContribId(contrib.id)
    setEditingContrib({ 
      title: contrib.title, 
      description: contrib.description || '', 
      category: contrib.category || 'plat',
      quantity: contrib.quantity || 1,
      budget: contrib.budget?.toString() || '',
    })
  }

  const handleSaveContribution = async () => {
    if (!editingContribId) return
    if (!editingContrib.title.trim()) {
      toast({
        title: 'Titre requis',
        description: 'Veuillez donner un titre à votre contribution',
        variant: 'destructive',
      })
      return
    }

    const description = editingContrib.description.trim() || undefined

    try {
      const response = await fetch(`/api/contributions/${editingContribId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: editingContrib.title.trim(),
          description,
          category: editingContrib.category,
          quantity: editingContrib.quantity || 1,
          budget: editingContrib.budget ? parseFloat(editingContrib.budget) : null,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Contribution mise à jour ! ✨',
          description: 'Vos modifications ont été enregistrées',
          variant: 'success',
        })
        setEditingContribId(null)
        if (activeTab === 'contributions') {
          void refreshActiveTab('contributions')
        } else {
          invalidateTab('contributions')
          scheduleCountsRefresh()
        }
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la contribution',
        variant: 'destructive',
      })
    }
  }

  const handleVote = async (pollId: string) => {
    const optionIds = selectedVotes[pollId]
    if (!optionIds || optionIds.length === 0) {
      toast({
        title: 'Sélection requise',
        description: 'Veuillez choisir une option',
        variant: 'destructive',
      })
      return
    }

    try {
      await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ optionIds }),
      })
      if (activeTab === 'polls') {
        void refreshActiveTab('polls')
      } else {
        invalidateTab('polls')
        scheduleCountsRefresh()
      }
      toast({
        title: 'Vote enregistré ! 🗳️',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de voter',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateTaskStatus = async (id: string, status: string) => {
    console.log('Updating task', id, 'to', status)
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast({ title: 'Statut mis à jour', variant: 'success' })
        if (activeTab === 'tasks') {
          void refreshActiveTab('tasks')
        } else {
          invalidateTab('tasks')
          scheduleCountsRefresh()
        }
      } else {
        let errMsg = 'Impossible de mettre à jour la tâche'
        try { const data = await res.json(); if (data?.error) errMsg = data.error } catch(e) {}
        console.error('Update task failed', res.status, errMsg)
        toast({ title: 'Erreur', description: errMsg, variant: 'destructive' })
      }
    } catch (error) {
      console.error('Update task network error', error)
      toast({ title: 'Erreur', variant: 'destructive' })
    }
  }

  const handleDeleteTask = async (id: string) => {
    const confirmed = window.confirm('Supprimer cette tâche ?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        toast({ title: 'Tâche supprimée', variant: 'success' })
        if (activeTab === 'tasks') {
          void refreshActiveTab('tasks')
        } else {
          invalidateTab('tasks')
          scheduleCountsRefresh()
        }
        return
      }

      let errMsg = 'Impossible de supprimer la tâche'
      try {
        const data = await res.json()
        if (data?.error) errMsg = data.error
      } catch (e) {
        // ignore
      }
      toast({ title: 'Erreur', description: errMsg, variant: 'destructive' })
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer la tâche', variant: 'destructive' })
    }
  }

  const handleCreateTask = async () => {
    if (!eventId) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer une tâche sans événement.',
        variant: 'destructive',
      })
      return
    }

    if (!newTask.title.trim()) {
      toast({
        title: 'Titre requis',
        description: 'Veuillez donner un titre à votre tâche',
        variant: 'destructive',
      })
      return
    }

    const description = newTask.description.trim() || undefined
    const dueDate = newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined

    try {
      const response = await fetch(`/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          title: newTask.title.trim(),
          description,
          isPrivate: newTask.isPrivate,
          dueDate,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Tâche créée avec succès',
        })
        setNewTask({ title: '', description: '', isPrivate: false, dueDate: '' })
        setIsTaskDialogOpen(false)
        if (activeTab === 'tasks') {
          void refreshActiveTab('tasks')
        } else {
          invalidateTab('tasks')
          scheduleCountsRefresh()
        }
      } else {
        toast({
          title: 'Erreur',
          description: 'Impossible de créer la tâche',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        variant: 'destructive',
      })
    }
  }

  const handleSaveTask = async () => {
    if (!editingTaskId) return
    if (!editingTask.title.trim()) {
      toast({ title: 'Titre requis', description: 'Veuillez donner un titre', variant: 'destructive' })
      return
    }

    const description = editingTask.description.trim() || undefined
    const dueDate = editingTask.dueDate ? new Date(editingTask.dueDate).toISOString() : undefined

    try {
      const res = await fetch(`/api/tasks/${editingTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: editingTask.title.trim(),
          description,
          dueDate,
        }),
      })

      if (res.ok) {
        toast({ title: 'Tâche modifiée', variant: 'success' })
        setIsEditTaskDialogOpen(false)
        setEditingTaskId(null)
        setEditingTask({ title: '', description: '', dueDate: '' })
        if (activeTab === 'tasks') {
          void refreshActiveTab('tasks')
        } else {
          invalidateTab('tasks')
          scheduleCountsRefresh()
        }
      } else {
        let errMsg = 'Impossible de modifier la tâche'
        try { const data = await res.json(); if (data?.error) errMsg = data.error } catch(e) {}
        toast({ title: 'Erreur', description: errMsg, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erreur', variant: 'destructive' })
    }
  }

  const handleCreatePoll = async () => {
    console.log('handleCreatePoll invoked', newPoll)
    if (!eventId) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer un sondage sans événement.',
        variant: 'destructive',
      })
      return
    }

    if (!newPoll.title.trim()) {
      toast({
        title: 'Titre requis',
        description: 'Veuillez donner un titre à votre sondage',
        variant: 'destructive',
      })
      return
    }

    const validOptions = newPoll.options
      .map((o) => o.trim())
      .filter(Boolean)
    if (validOptions.length < 2) {
      toast({
        title: 'Options insuffisantes',
        description: 'Veuillez ajouter au moins 2 options',
        variant: 'destructive',
      })
      return
    }

    try {
      const description = newPoll.description.trim() || undefined
      const imageUrl = newPoll.imageUrl || undefined
      const autoClose = newPoll.autoClose ? new Date(newPoll.autoClose).toISOString() : undefined

      const response = await fetch(`/api/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          title: newPoll.title.trim(),
          description,
          type: newPoll.type,
          imageUrl,
          autoClose,
          options: validOptions,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Sondage créé avec succès',
        })
        setNewPoll({ title: '', description: '', type: 'SINGLE', options: ['', ''], imageUrl: '', pollImagePreview: '', autoClose: '' })
        setIsPollDialogOpen(false)
        if (activeTab === 'polls') {
          void refreshActiveTab('polls')
        } else {
          invalidateTab('polls')
          scheduleCountsRefresh()
        }
      } else {
        let errMsg = 'Impossible de créer le sondage'
        try {
          const data = await response.json()
          if (data?.error) errMsg = data.error
        } catch (e) {
          // ignore
        }
        console.error('Create poll failed', response.status, errMsg)
        toast({
          title: 'Erreur',
          description: errMsg,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        variant: 'destructive',
      })
    }
  }

  const handleEditPoll = (poll: Poll) => {
    setEditingPollId(poll.id)
    setEditingPoll({
      title: poll.title,
      description: poll.description || '',
      type: poll.type,
      options: poll.options.map((o) => o.label),
      imageUrl: poll.imageUrl || '',
      pollImagePreview: poll.imageUrl || '',
      autoClose: poll.autoClose || '',
    })
    setIsEditPollDialogOpen(true)
  }

  const handleSavePoll = async () => {
    if (!editingPollId) return
    if (!editingPoll.title.trim()) {
      toast({ title: 'Titre requis', variant: 'destructive' })
      return
    }

    const validOptions = editingPoll.options
      .map((o) => o.trim())
      .filter(Boolean)
    if (validOptions.length < 2) {
      toast({
        title: 'Options insuffisantes',
        description: 'Veuillez ajouter au moins 2 options',
        variant: 'destructive',
      })
      return
    }

    try {
      const description = editingPoll.description.trim() || undefined
      const imageUrl = editingPoll.imageUrl || undefined

      const response = await fetch(`/api/polls/${editingPollId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: editingPoll.title.trim(),
          description,
          type: editingPoll.type,
          imageUrl,
          options: validOptions.map((label) => ({ label })),
        }),
      })

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Sondage modifié avec succès',
        })
        setEditingPollId(null)
        setIsEditPollDialogOpen(false)
        if (activeTab === 'polls') {
          void refreshActiveTab('polls')
        } else {
          invalidateTab('polls')
          scheduleCountsRefresh()
        }
      } else {
        let errMsg = 'Impossible de modifier le sondage'
        try {
          const data = await response.json()
          if (data?.error) errMsg = data.error
        } catch (e) {
          // ignore
        }
        toast({
          title: 'Erreur',
          description: errMsg,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le sondage',
        variant: 'destructive',
      })
    }
  }

  const handleSendMessage = async () => {
    if (!eventId) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer un message sans événement.',
        variant: 'destructive',
      })
      return
    }
    if (!newMessage.trim()) return

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: newMessage.trim(),
          eventId,
          imageUrls: chatImageUrls,
        }),
      })
      setNewMessage('')
      setChatImageUrls([])
      setChatImagePreviews([])
      if (activeTab === 'chat') {
        void refreshActiveTab('chat')
      } else {
        invalidateTab('chat')
        scheduleCountsRefresh()
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive',
      })
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: 'Code copié ! 📋',
      description: 'Partagez-le avec votre famille',
    })
  }

  const handlePrint = () => {
    window.print()
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-900 via-red-900 to-green-900">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🎄</div>
          <div className="text-white text-xl font-semibold">Chargement...</div>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Événement non trouvé</h2>
          <Link href="/dashboard">
            <Button>Retour au tableau de bord</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'BROUGHT': return 'bg-green-100 text-green-800'
      case 'TODO': return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'DONE': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'Prévu'
      case 'CONFIRMED': return 'Confirmé'
      case 'BROUGHT': return 'Apporté'
      case 'TODO': return 'À faire'
      case 'IN_PROGRESS': return 'En cours'
      case 'DONE': return 'Terminé'
      default: return status
    }
  }

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'plat': return '🍽️'
      case 'boisson': return '🍷'
      case 'décor': return '🎄'
      case 'ingredient': return '🧄'
      default: return '🎁'
    }
  }

  return (
    <div className="min-h-screen bg-transparent print:bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b-2 border-christmas-red shadow-sm no-print">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-5 w-5" />
                Retour
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              {event.eventCodes && event.eventCodes.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => handleCopyCode(event.eventCodes![0].code)}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Inviter</span>
                </Button>
              )}
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Imprimer</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Event Header */}
        <div className="mb-8 space-y-4 print:mb-4 bg-white/90 p-6 rounded-xl shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-christmas-red flex items-center gap-3">
                🎄 {event.name}
              </h1>
              {event.description && (
                <p className="text-lg text-gray-600 mt-2">
                  {event.description}
                </p>
              )}
            </div>
            <span className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              event.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            )}>
              {event.status === 'OPEN' ? '✨ Ouvert' : 'Terminé'}
            </span>
          </div>

          <div className="flex flex-wrap gap-6 text-gray-700">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-christmas-red" />
              <span>
                {formatDate(event.date)} à {formatTime(event.date)}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-christmas-green" />
                {event.mapUrl ? (
                  <a
                    href={event.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {event.location}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <span>{event.location}</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>{event.participants.length} participants</span>
            </div>
          </div>

          {/* Participants avatars */}
          <div className="flex flex-wrap gap-2">
            {event.participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1 bg-gray-200 px-2 py-1 rounded-full text-sm text-gray-900 font-medium"
                title={p.name}
              >
                <span>{p.avatar || '👤'}</span>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 no-print">
          {[
            { id: 'contributions', label: 'Contributions', icon: ChefHat, count: event.counts?.contributions ?? event.contributions.length },
            { id: 'menu', label: 'Menu', icon: Sparkles, count: event.counts?.menuRecipes ?? (event.menuRecipes?.length || 0) },
            { id: 'polls', label: 'Sondages', icon: BarChart3, count: event.counts?.polls ?? event.polls.length },
            { id: 'tasks', label: 'Tâches', icon: ClipboardList, count: event.counts?.tasks ?? event.tasks.length },
            { id: 'chat', label: 'Discussion', icon: MessageCircle, count: event.counts?.chatMessages ?? event.chatMessages.length },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="gap-2"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                {tab.count}
              </span>
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Menu Tab */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              <Card className="border-2 border-christmas-green">
                <CardHeader className="bg-gradient-to-r from-christmas-green to-christmas-red text-white">
                  <CardTitle className="flex items-center justify-between">
                    <span>🍽️ Menu de l&apos;événement</span>
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    Ajoutez des recettes et laissez chacun prendre des ingrédients.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipe-title">Nom de la recette</Label>
                      <Input id="recipe-title" placeholder="Ex: Dinde rôtie" value={newRecipe.title} onChange={(e) => setNewRecipe({ ...newRecipe, title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipe-desc">Description (optionnel)</Label>
                      <Input id="recipe-desc" placeholder="Détails..." value={newRecipe.description} onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={handleCreateRecipe} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Ajouter la recette
                  </Button>
                </CardContent>
              </Card>

              {loadingTabs.menu ? (
                <Card className="border-2 border-christmas-green/60 py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-christmas-green" />
                    <p className="text-sm text-gray-600">Chargement du menu...</p>
                  </div>
                </Card>
              ) : event.menuRecipes?.length ? (
                event.menuRecipes.map((recipe) => (
                  <Card key={recipe.id} className="border-2 border-christmas-green/60">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-christmas-green" /> {recipe.title}
                      </CardTitle>
                      {recipe.description && <CardDescription>{recipe.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Ingrédient</Label>
                          <Input
                            placeholder="Ex: Pommes de terre"
                            value={newIngredient[recipe.id]?.name || ''}
                            onChange={(e) => setNewIngredient((prev) => ({ ...prev, [recipe.id]: { ...(prev[recipe.id] || { name: '', details: '' }), name: e.target.value } }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Détails (optionnel)</Label>
                          <Input
                            placeholder="Quantité, marque..."
                            value={newIngredient[recipe.id]?.details || ''}
                            onChange={(e) => setNewIngredient((prev) => ({ ...prev, [recipe.id]: { ...(prev[recipe.id] || { name: '', details: '' }), details: e.target.value } }))}
                          />
                        </div>
                        <div>
                          <Button onClick={() => handleAddIngredient(recipe.id)} className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Ajouter l&apos;ingrédient
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold">Liste des ingrédients</Label>
                        <div className="space-y-2">
                          {recipe.ingredients.length === 0 && (
                            <div className="text-gray-600">Aucun ingrédient ajouté pour l&apos;instant.</div>
                          )}
                          {recipe.ingredients.map((ing) => (
                            <div key={ing.id} className="flex items-center justify-between bg-white/70 border rounded-lg p-3">
                              <div className="flex-1">
                                <div className="font-medium">
                                  {ing.name}
                                  {ing.details ? <span className="text-gray-600"> — {ing.details}</span> : null}
                                </div>
                                {ing.contribution?.assignee ? (
                                  <div className="text-sm text-green-700 flex items-center gap-1">
                                    ✓ Pris en charge par {ing.contribution.assignee.name}
                                    <span className="text-xs text-gray-500 italic">(contribution créée)</span>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500">Disponible</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {!ing.contribution?.assignee && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleClaimIngredient(ing.id)}
                                    disabled={claimingIngredientId === ing.id}
                                    className="no-print"
                                    title="Créer une contribution et me l'assigner"
                                  >
                                    {claimingIngredientId === ing.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                      <Check className="h-4 w-4 mr-1" />
                                    )}
                                    Je m’en occupe
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-6 text-center text-gray-700">Aucune recette encore. Ajoutez-en une pour commencer.</CardContent>
                </Card>
              )}
            </div>
          )}
          {/* Contributions Tab */}
          {activeTab === 'contributions' && (
            <div className="space-y-6">
              {/* Add contribution form */}
              <div className="flex flex-wrap gap-2">
                <Dialog open={isContribDialogOpen} onOpenChange={setIsContribDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="no-print">
                      <Plus className="mr-2 h-5 w-5" />
                      Ajouter une contribution
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Ajouter une contribution
                    </DialogTitle>
                    <DialogDescription>
                      Qu&apos;apportez-vous pour la fête ?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contrib-title">Titre</Label>
                      <Input
                        id="contrib-title"
                        placeholder="Ex: Bûche de Noël"
                        value={newContribution.title}
                        onChange={(e) => setNewContribution({ ...newContribution, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contrib-category">Catégorie</Label>
                      <select
                        id="contrib-category"
                        className="w-full h-12 px-3 rounded-lg border-2 text-lg"
                        value={newContribution.category}
                        onChange={(e) => setNewContribution({ ...newContribution, category: e.target.value })}
                      >
                        <option value="plat">🍽️ Plat</option>
                        <option value="boisson">🍷 Boisson</option>
                        <option value="décor">🎄 Décoration</option>
                        <option value="ingredient">🧄 Ingrédient</option>
                        <option value="autre">🎁 Autre</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contrib-desc">Description (optionnel)</Label>
                    <Input
                      id="contrib-desc"
                      placeholder="Détails sur votre contribution..."
                      value={newContribution.description}
                      onChange={(e) => setNewContribution({ ...newContribution, description: e.target.value })}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contrib-quantity">Quantité</Label>
                      <Input
                        id="contrib-quantity"
                        type="number"
                        min="1"
                        placeholder="1"
                        value={newContribution.quantity}
                        onChange={(e) => setNewContribution({ ...newContribution, quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contrib-budget">Budget (€, optionnel)</Label>
                      <Input
                        id="contrib-budget"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newContribution.budget}
                        onChange={(e) => setNewContribution({ ...newContribution, budget: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contrib-image">📸 Photo (optionnel)</Label>
                    <input
                      id="contrib-image"
                      type="file"
                      accept="image/*"
                      onChange={handleContributionImageChange}
                      className="w-full px-3 py-2 border-2 rounded-lg file:mr-2 file:px-3 file:py-1 file:rounded file:border-0 file:bg-christmas-red file:text-white file:cursor-pointer hover:file:bg-christmas-green"
                    />
                    {newContribution.contribImagePreview && (
                      <div className="relative w-full h-40 rounded-lg overflow-hidden">
                        <Image
                          src={newContribution.contribImagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          fill
                        />
                        <button
                          onClick={() => setNewContribution({ ...newContribution, imageUrl: '', contribImagePreview: '' })}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleAddContribution} size="lg" className="w-full">
                    <Gift className="mr-2 h-5 w-5" />
                    Je m&apos;engage à apporter
                  </Button>
                </DialogContent>
              </Dialog>
              {event.contributions.length > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  className="no-print"
                  onClick={() => {
                    if (!eventId) return
                    window.open(`/api/events/${eventId}/contributions/export`, '_blank')
                  }}
                >
                  📥 Exporter CSV
                </Button>
              )}
              </div>

              {/* Contributions list */}
              {/* Contributions table overview */}
              <Card className="border-2 border-christmas-red overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-christmas-red to-christmas-green text-white">
                  <CardTitle className="flex items-center justify-between">
                    <span>📋 Récapitulatif des contributions</span>
                    <div className="flex gap-2">
                      <select
                        value={sortCategory || ''}
                        onChange={(e) => setSortCategory(e.target.value || null)}
                        className="px-3 py-1 rounded-lg bg-white/20 text-white border border-white text-sm cursor-pointer hover:bg-white/30 transition-all [&>option]:text-gray-900 [&>option]:bg-white"
                      >
                        <option value="">Toutes les catégories</option>
                        <option value="plat">🍽️ Plats</option>
                        <option value="boisson">🍷 Boissons</option>
                        <option value="décor">🎄 Décorations</option>
                        <option value="ingredient">🧄 Ingrédients</option>
                        <option value="autre">🎁 Autres</option>
                      </select>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm sm:text-base">
                      <thead>
                        <tr className="bg-gradient-to-r from-christmas-red/10 to-christmas-green/10">
                          <th className="border-2 border-christmas-red/30 px-2 sm:px-4 py-3 text-left font-semibold text-gray-900">Catégorie</th>
                          <th className="border-2 border-christmas-red/30 px-2 sm:px-4 py-3 text-left font-semibold text-gray-900">Contribution</th>
                          <th className="hidden sm:table-cell border-2 border-christmas-red/30 px-2 sm:px-4 py-3 text-left font-semibold text-gray-900">Description</th>
                          <th className="hidden md:table-cell border-2 border-christmas-red/30 px-2 sm:px-4 py-3 text-left font-semibold text-gray-900">Apporté par</th>
                          <th className="border-2 border-christmas-red/30 px-2 sm:px-4 py-3 text-left font-semibold text-gray-900">Statut</th>
                          <th className="border-2 border-christmas-red/30 px-2 sm:px-4 py-3 text-center font-semibold text-gray-900 no-print">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingTabs.contributions ? (
                          <tr>
                            <td colSpan={6} className="border-2 border-christmas-red/30 px-2 sm:px-4 py-12 text-center text-gray-700 bg-white/50">
                              <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-christmas-green" />
                                <p className="text-sm">Chargement des contributions...</p>
                              </div>
                            </td>
                          </tr>
                        ) : event.contributions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="border-2 border-christmas-red/30 px-2 sm:px-4 py-8 text-center text-gray-700 bg-white/50">
                              Aucune contribution pour l&apos;instant. Soyez le premier ! 🎁
                            </td>
                          </tr>
                        ) : (
                          event.contributions
                            .filter(c => !sortCategory || (c.category || 'autre') === sortCategory)
                            .map((contrib, index) => 
                              editingContribId === contrib.id ? (
                                <tr key={contrib.id} className="bg-blue-50/50 border-2 border-christmas-red/30">
                                  <td colSpan={6} className="px-2 sm:px-4 py-4">
                                    <div className="space-y-3">
                                      <div className="grid sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs">Titre</Label>
                                          <Input
                                            placeholder="Titre"
                                            value={editingContrib.title}
                                            onChange={(e) => setEditingContrib({ ...editingContrib, title: e.target.value })}
                                            className="text-sm"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">Catégorie</Label>
                                          <select
                                            className="w-full h-10 px-3 rounded-lg border-2 text-sm"
                                            value={editingContrib.category}
                                            onChange={(e) => setEditingContrib({ ...editingContrib, category: e.target.value })}
                                          >
                                            <option value="plat">🍽️ Plat</option>
                                            <option value="boisson">🍷 Boisson</option>
                                            <option value="décor">🎄 Décoration</option>
                                            <option value="ingredient">🧄 Ingrédient</option>
                                            <option value="autre">🎁 Autre</option>
                                          </select>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Description</Label>
                                        <Input
                                          placeholder="Description"
                                          value={editingContrib.description}
                                          onChange={(e) => setEditingContrib({ ...editingContrib, description: e.target.value })}
                                          className="text-sm"
                                        />
                                      </div>
                                      <div className="grid sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs">Quantité</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            placeholder="1"
                                            value={editingContrib.quantity}
                                            onChange={(e) => setEditingContrib({ ...editingContrib, quantity: parseInt(e.target.value) || 1 })}
                                            className="text-sm"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">Budget (€)</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={editingContrib.budget}
                                            onChange={(e) => setEditingContrib({ ...editingContrib, budget: e.target.value })}
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2 justify-end">
                                        <Button size="sm" variant="outline" onClick={() => setEditingContribId(null)}>Annuler</Button>
                                        <Button size="sm" onClick={handleSaveContribution}>Enregistrer</Button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr 
                                  key={contrib.id} 
                                  className={cn(
                                    'border-2 border-christmas-red/30 transition-colors cursor-pointer md:cursor-default',
                                    index % 2 === 0 ? 'bg-white/50' : 'bg-green-50/30',
                                    'hover:bg-yellow-50/50'
                                  )}
                                  onClick={() => setSelectedContribForDetail(contrib)}
                                >
                                  <td className="px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm">
                                    {getCategoryIcon(contrib.category || 'autre')} <span className="hidden sm:inline">{contrib.category === 'plat' ? 'Plat' : contrib.category === 'boisson' ? 'Boisson' : contrib.category === 'décor' ? 'Décor' : 'Autre'}</span>
                                  </td>
                                  <td className="px-2 sm:px-4 py-3 font-semibold flex items-center gap-3">
                                    {contrib.imageUrl && (
                                      <Image src={contrib.imageUrl} alt="Photo" className="w-12 h-12 rounded-md object-cover hidden sm:block" width={48} height={48} />
                                    )}
                                    <span>{contrib.title}</span>
                                  </td>
                                  <td className="hidden sm:table-cell px-2 sm:px-4 py-3 text-gray-700 text-xs sm:text-sm">
                                    {contrib.description || '-'}
                                  </td>
                                  <td className="hidden md:table-cell px-2 sm:px-4 py-3 text-xs sm:text-sm">
                                    <span className="flex items-center gap-1">
                                      <span>{contrib.assignee?.avatar || '👤'}</span>
                                      <span className="hidden lg:inline">{contrib.assignee?.name || 'Non assigné'}</span>
                                    </span>
                                  </td>
                                  <td className="px-2 sm:px-4 py-3">
                                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(contrib.status))}>
                                      {getStatusLabel(contrib.status)}
                                    </span>
                                  </td>
                                  <td className="px-2 sm:px-4 py-3 text-center no-print" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex gap-1 justify-center">
                                      {contrib.assignee?.id === user?.id && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditContribution(contrib)}
                                          title="Éditer"
                                        >
                                          ✏️
                                        </Button>
                                      )}
                                      {contrib.assignee?.id === user?.id && contrib.status !== 'BROUGHT' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleUpdateContributionStatus(
                                            contrib.id,
                                            contrib.status === 'PLANNED' ? 'CONFIRMED' : 'BROUGHT'
                                          )}
                                          title="Mettre à jour le statut"
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDuplicateContribution(contrib)}
                                        title="Dupliquer"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            )
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary stats */}
              {event.contributions.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-gray-700">{event.contributions.length}</div>
                      <div className="text-sm text-gray-700 mt-1">Contributions totales</div>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-blue-600">{event.contributions.filter(c => c.status === 'CONFIRMED').length}</div>
                      <div className="text-sm text-gray-700 mt-1">Confirmées</div>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-green-600">{event.contributions.filter(c => c.status === 'BROUGHT').length}</div>
                      <div className="text-sm text-gray-700 mt-1">Apportées</div>
                    </CardContent>
                  </Card>
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-yellow-600">{event.contributions.filter(c => c.status === 'PLANNED').length}</div>
                      <div className="text-sm text-gray-700 mt-1">En attente</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Edit Task Dialog */}
          <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Éditer la tâche</DialogTitle>
                <DialogDescription>Modifier le titre, la description et la date d&apos;échéance</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Titre *</Label>
                  <Input value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={editingTask.description} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Échéance</Label>
                  <input type="datetime-local" value={editingTask.dueDate} onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })} className="w-full h-10 px-3 rounded-lg border-2" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setIsEditTaskDialogOpen(false); setEditingTaskId(null) }}>Annuler</Button>
                  <Button onClick={handleSaveTask}>Enregistrer</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Polls Tab */}
          {activeTab === 'polls' && (
            <div className="space-y-6">
              <div className="flex gap-2">
                <Dialog open={isPollDialogOpen} onOpenChange={setIsPollDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nouveau sondage
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Créer un nouveau sondage</DialogTitle>
                      <DialogDescription>Posez une question et ajoutez des options de réponse</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="poll-title">Question *</Label>
                        <Input
                          id="poll-title"
                          placeholder="Ex: Quel jour vous convient le mieux ?"
                          value={newPoll.title}
                          onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="poll-description">Description</Label>
                        <Input
                          id="poll-description"
                          placeholder="Détails supplémentaires (optionnel)"
                          value={newPoll.description}
                          onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="poll-image">📸 Image bannière (optionnel)</Label>
                        <input
                          id="poll-image"
                          type="file"
                          accept="image/*"
                          onChange={handlePollImageChange}
                          className="w-full px-3 py-2 border-2 rounded-lg file:mr-2 file:px-3 file:py-1 file:rounded file:border-0 file:bg-christmas-red file:text-white file:cursor-pointer hover:file:bg-christmas-green"
                        />
                        {newPoll.pollImagePreview && (
                          <div className="relative w-full h-40 rounded-lg overflow-hidden">
                            <Image
                              src={newPoll.pollImagePreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              fill
                            />
                            <button
                              onClick={() => setNewPoll({ ...newPoll, imageUrl: '', pollImagePreview: '' })}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="poll-type">Type de sondage</Label>
                        <select
                          id="poll-type"
                          className="w-full h-10 px-3 rounded-lg border-2 border-gray-200"
                          value={newPoll.type}
                          onChange={(e) => setNewPoll({ ...newPoll, type: e.target.value })}
                        >
                          <option value="SINGLE">Choix unique</option>
                          <option value="MULTIPLE">Choix multiples</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="poll-autoclose">Fermeture automatique (optionnel)</Label>
                        <input
                          id="poll-autoclose"
                          type="datetime-local"
                          className="w-full h-10 px-3 rounded-lg border-2"
                          value={newPoll.autoClose}
                          onChange={(e) => setNewPoll({ ...newPoll, autoClose: e.target.value })}
                        />
                        <p className="text-xs text-gray-500">Le sondage se fermera automatiquement à cette date/heure</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Options de réponse *</Label>
                        <div className="space-y-2">
                          {newPoll.options.map((option, idx) => (
                            <div key={idx} className="flex gap-2">
                              <Input
                                placeholder={`Option ${idx + 1}`}
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...newPoll.options]
                                  newOptions[idx] = e.target.value
                                  setNewPoll({ ...newPoll, options: newOptions })
                                }}
                              />
                              {newPoll.options.length > 2 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const newOptions = newPoll.options.filter((_, i) => i !== idx)
                                    setNewPoll({ ...newPoll, options: newOptions })
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNewPoll({ ...newPoll, options: [...newPoll.options, ''] })}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter une option
                        </Button>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsPollDialogOpen(false)}>Annuler</Button>
                        <Button type="button" onClick={() => { toast({ title: 'Envoi', description: 'Création en cours...' }); handleCreatePoll(); }}>Créer le sondage</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Edit Poll Dialog */}
                <Dialog open={isEditPollDialogOpen} onOpenChange={setIsEditPollDialogOpen}>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Éditer le sondage</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-poll-title">Titre *</Label>
                        <Input
                          id="edit-poll-title"
                          placeholder="Titre du sondage"
                          value={editingPoll.title}
                          onChange={(e) => setEditingPoll({ ...editingPoll, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-poll-desc">Description</Label>
                        <Input
                          id="edit-poll-desc"
                          placeholder="Description (optionnel)"
                          value={editingPoll.description}
                          onChange={(e) => setEditingPoll({ ...editingPoll, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <select
                          value={editingPoll.type}
                          onChange={(e) => setEditingPoll({ ...editingPoll, type: e.target.value as 'SINGLE' | 'MULTIPLE' })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="SINGLE">Une seule réponse</option>
                          <option value="MULTIPLE">Plusieurs réponses</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {editingPoll.options.map((option, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              placeholder={`Option ${idx + 1}`}
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...editingPoll.options]
                                newOptions[idx] = e.target.value
                                setEditingPoll({ ...editingPoll, options: newOptions })
                              }}
                            />
                            {editingPoll.options.length > 2 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newOptions = editingPoll.options.filter((_, i) => i !== idx)
                                  setEditingPoll({ ...editingPoll, options: newOptions })
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPoll({ ...editingPoll, options: [...editingPoll.options, ''] })}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter une option
                        </Button>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsEditPollDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleSavePoll}>Enregistrer les modifications</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              {event.polls.length === 0 ? (
                <Card className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">Aucun sondage pour l’instant</p>
                </Card>
              ) : (
                event.polls.map((poll) => {
                  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0)
                  
                  // Calculate non-voters
                  const allVoters = new Set<string>()
                  poll.options.forEach((option) => {
                    option.voters?.forEach((voter) => {
                      allVoters.add(voter.id)
                    })
                  })
                  
                  const nonVoters = event.participants.filter((p) => !allVoters.has(p.id))

                  return (
                    <Card key={poll.id}>
                      {poll.imageUrl && (
                        <div
                          className="relative w-full bg-gradient-to-b from-gray-200 to-gray-100 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedPollImageId(poll.id)}
                        >
                          <div className="relative w-full aspect-[4/3] max-h-56">
                            <Image
                              src={poll.imageUrl}
                              alt={poll.title}
                              className="w-full h-full object-cover"
                              fill
                              priority
                            />
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            Cliquer pour agrandir
                          </div>
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{poll.title}</CardTitle>
                            {poll.description && (
                              <CardDescription>{poll.description}</CardDescription>
                            )}
                            {poll.autoClose && !poll.isClosed && (
                              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                ⏰ Se ferme automatiquement le {formatDate(poll.autoClose)} à {formatTime(poll.autoClose)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {user?.id === poll.createdById && !poll.isClosed && (
                              <Button size="sm" variant="outline" onClick={() => handleEditPoll(poll)}>
                                Éditer
                              </Button>
                            )}
                            {poll.isClosed && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                                Fermé
                              </span>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {poll.options.map((option) => {
                          const percentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0
                          const isSelected = selectedVotes[poll.id]?.includes(option.id)
                          const wasVoted = poll.userVotes.includes(option.id)

                          return (
                            <div key={option.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-3 cursor-pointer">
                                  {!poll.isClosed && (
                                    <input
                                      type={poll.type === 'SINGLE' ? 'radio' : 'checkbox'}
                                      name={`poll-${poll.id}`}
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (poll.type === 'SINGLE') {
                                          setSelectedVotes({ ...selectedVotes, [poll.id]: [option.id] })
                                        } else {
                                          const current = selectedVotes[poll.id] || []
                                          if (e.target.checked) {
                                            setSelectedVotes({ ...selectedVotes, [poll.id]: [...current, option.id] })
                                          } else {
                                            setSelectedVotes({ ...selectedVotes, [poll.id]: current.filter((id) => id !== option.id) })
                                          }
                                        }
                                      }}
                                      className="h-5 w-5"
                                    />
                                  )}
                                  <span className={cn('text-lg', wasVoted && 'font-semibold')}>
                                    {option.label}
                                    {wasVoted && ' ✓'}
                                  </span>
                                </label>
                                <span className="text-muted-foreground">
                                  {option.voteCount} vote{option.voteCount !== 1 ? 's' : ''} ({percentage}%)
                                </span>
                              </div>
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-christmas-green transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              {option.voters && option.voters.length > 0 && (
                                <div className="flex items-center gap-2 pt-1">
                                  <span className="text-xs text-gray-500">Votants:</span>
                                  <VoterAvatars voters={option.voters} size="sm" maxDisplay={8} />
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {!poll.isClosed && (
                          <Button
                            onClick={() => handleVote(poll.id)}
                            className="mt-4"
                            disabled={!selectedVotes[poll.id]?.length}
                          >
                            {poll.hasVoted ? 'Modifier mon vote' : 'Voter'}
                          </Button>
                        )}

                        {nonVoters.length > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-blue-600 font-medium">N&apos;ont pas encore voté:</span>
                              <VoterAvatars voters={nonVoters} size="sm" maxDisplay={6} />
                            </div>
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground">
                          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} au total
                        </p>
                      </CardContent>
                    </Card>
                  )
                })
              )}

                {/* Poll Image Modal */}
                <Dialog open={!!selectedPollImageId} onOpenChange={(open) => !open && setSelectedPollImageId(null)}>
                  <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black border-0">
                    {event.polls.find(p => p.id === selectedPollImageId)?.imageUrl && (
                      <div className="relative w-full h-[80vh]">
                        <Image
                          src={event.polls.find(p => p.id === selectedPollImageId)?.imageUrl || ''}
                          alt="Poll image"
                          className="w-full h-full object-contain"
                          fill
                        />
                        <button
                          onClick={() => setSelectedPollImageId(null)}
                          className="absolute top-4 right-4 bg-white/80 hover:bg-white text-black rounded-full p-2 transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex gap-2">
                <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nouvelle tâche
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Créer une nouvelle tâche</DialogTitle>
                      <DialogDescription>Ajouter une tâche pour organiser votre événement</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="task-title">Titre *</Label>
                        <Input
                          id="task-title"
                          placeholder="Ex: Acheter les décorations"
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-description">Description</Label>
                        <Input
                          id="task-description"
                          placeholder="Détails supplémentaires..."
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-due">Échéance (optionnel)</Label>
                        <input
                          id="task-due"
                          type="datetime-local"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border-2"
                        />
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          id="is-private"
                          checked={!newTask.isPrivate}
                          onChange={(e) => setNewTask({ ...newTask, isPrivate: !e.target.checked })}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <Label htmlFor="is-private" className="cursor-pointer flex-1 mb-0">
                          <span className="font-medium">Tâche publique</span>
                          <p className="text-xs text-gray-600 mt-1">
                            {newTask.isPrivate 
                              ? 'Seul vous pouvez voir cette tâche' 
                              : 'Tous les participants de l\'événement peuvent voir cette tâche'}
                          </p>
                        </Label>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreateTask}>Créer la tâche</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {['TODO', 'IN_PROGRESS', 'DONE'].map((status) => {
                const statusTasks = event.tasks.filter((t) => {
                  // Afficher les tâches publiques pour tout le monde
                  if (!t.isPrivate) return t.status === status
                  // Afficher les tâches privées seulement au créateur
                  return t.status === status && (t.createdBy?.id === user?.id || user?.role === 'ADMIN')
                })
                
                return (
                  <Card key={status}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className={cn('w-3 h-3 rounded-full', 
                          status === 'TODO' ? 'bg-gray-400' : 
                          status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-green-500'
                        )} />
                        {getStatusLabel(status)} ({statusTasks.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingTabs.tasks ? (
                        <div className="flex flex-col items-center gap-3 py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-christmas-green" />
                          <p className="text-sm text-gray-600">Chargement...</p>
                        </div>
                      ) : statusTasks.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          Aucune tâche
                        </p>
                      ) : (
                        <div className="divide-y">
                          {statusTasks.map((task) => (
                            <div key={task.id} className="py-3 flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  {task.title}
                                  {task.isPrivate && (
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded flex items-center gap-1">
                                      🔒 Privée
                                    </span>
                                  )}
                                </div>
                                {task.description && (
                                  <div className="text-sm text-muted-foreground">{task.description}</div>
                                )}
                                <div className="text-sm mt-1 flex items-center gap-2">
                                  {task.assignee && (
                                    <span className="flex items-center gap-1">
                                      <span>{task.assignee.avatar || '👤'}</span>
                                      {task.assignee.name}
                                    </span>
                                  )}
                                  {task.dueDate && (
                                    <span className="text-muted-foreground">
                                      • Échéance: {formatDate(task.dueDate, { weekday: undefined, year: undefined })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 items-center">
                                {(task.assignee?.id === user?.id || task.createdBy?.id === user?.id || user?.role === 'ADMIN') && (
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                                    className="h-9 px-2 rounded-lg border-2 text-sm bg-white no-print"
                                    aria-label="Changer le statut"
                                  >
                                    <option value="TODO">À faire</option>
                                    <option value="IN_PROGRESS">En cours</option>
                                    <option value="DONE">Terminé</option>
                                  </select>
                                )}

                                {(task.assignee?.id === user?.id || task.createdBy?.id === user?.id || user?.role === 'ADMIN') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingTaskId(task.id)
                                      const toLocalDatetimeInput = (d: string) => {
                                        const date = new Date(d)
                                        const pad = (n: number) => String(n).padStart(2, '0')
                                        const yyyy = date.getFullYear()
                                        const mm = pad(date.getMonth() + 1)
                                        const dd = pad(date.getDate())
                                        const hh = pad(date.getHours())
                                        const min = pad(date.getMinutes())
                                        return `${yyyy}-${mm}-${dd}T${hh}:${min}`
                                      }
                                      setEditingTask({ title: task.title, description: task.description || '', dueDate: task.dueDate ? toLocalDatetimeInput(task.dueDate) : '' })
                                      setIsEditTaskDialogOpen(true)
                                    }}
                                    className="no-print"
                                  >
                                    ✏️ Éditer
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    window.open(`/api/tasks/${task.id}/ical`, '_blank')
                                  }}
                                  className="no-print"
                                  title="Exporter vers calendrier (iCal)"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>

                                {(task.createdBy?.id === user?.id || user?.role === 'ADMIN') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="no-print"
                                  >
                                    🗑️ Supprimer
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <Card className="no-print">
              <CardHeader className="border-b bg-gradient-to-r from-christmas-green/10 to-christmas-red/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-christmas-green" />
                    Discussion
                  </CardTitle>
                  {!notificationsEnabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const permission = await requestNotificationPermission()
                        setNotificationsEnabled(permission === 'granted')
                        if (permission === 'granted') {
                          toast({ title: '🔔 Notifications activées', description: 'Vous recevrez des alertes pour les nouveaux messages', variant: 'success' })
                        }
                      }}
                      className="gap-2"
                    >
                      🔔 Activer notifications
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages container with improved styling */}
                <div className="h-[500px] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
                  {loadingTabs.chat ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-christmas-green" />
                      <p className="text-sm text-gray-600 mt-3">Chargement des messages...</p>
                    </div>
                  ) : event.chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
                      <p className="text-gray-500 font-medium mb-2">
                        Aucun message pour le moment
                      </p>
                      <p className="text-sm text-gray-400">
                        Soyez le premier à écrire ! 💬
                      </p>
                    </div>
                  ) : (
                    event.chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
                          msg.user.id === user?.id ? 'flex-row-reverse' : ''
                        )}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-christmas-green to-christmas-red flex items-center justify-center text-xl shadow-md">
                            {msg.user.avatar || '👤'}
                          </div>
                        </div>
                        
                        {/* Message bubble */}
                        <div className={cn(
                          'max-w-[75%] sm:max-w-[60%]'
                        )}>
                          {/* Name tag */}
                          {msg.user.id !== user?.id && (
                            <div className="text-xs font-medium text-gray-600 mb-1 px-1">
                              {msg.user.name}
                            </div>
                          )}
                          
                          {/* Bubble */}
                          <div className={cn(
                            'rounded-2xl px-4 py-3 shadow-sm',
                            msg.user.id === user?.id
                              ? 'bg-gradient-to-br from-christmas-green to-green-600 text-white rounded-tr-sm'
                              : 'bg-white border-2 border-gray-100 text-gray-800 rounded-tl-sm'
                          )}>
                            <div className="break-words">{msg.content}</div>
                            
                            {/* Images */}
                            {msg.media && msg.media.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {msg.media.map((m) => (
                                  <div key={m.id} className="relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                                    <Image 
                                      src={m.imageUrl} 
                                      alt="Chat attachment" 
                                      className="max-w-[280px] h-auto rounded-lg cursor-pointer hover:opacity-95 transition-opacity" 
                                      width={400} 
                                      height={300}
                                      onClick={() => window.open(m.imageUrl, '_blank')}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Timestamp */}
                            <div className={cn(
                              'text-xs mt-2 font-medium',
                              msg.user.id === user?.id ? 'text-white/80' : 'text-gray-500'
                            )}>
                              {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input area */}
                <div className="border-t bg-white p-4 space-y-3">
                  {/* Image previews */}
                  {chatImagePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {chatImagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200">
                          <Image src={preview} alt="Preview" className="w-full h-full object-cover" fill />
                          <button
                            onClick={() => {
                              setChatImageUrls(chatImageUrls.filter((_, i) => i !== idx))
                              setChatImagePreviews(chatImagePreviews.filter((_, i) => i !== idx))
                            }}
                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 text-xs font-bold shadow-md"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Input row */}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleChatImageChange}
                      className="hidden"
                      id="chat-image-upload"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => document.getElementById('chat-image-upload')?.click()}
                      className="flex-shrink-0 h-11 w-11 rounded-xl hover:bg-gray-100"
                      title="Ajouter des photos"
                    >
                      <span className="text-xl">📸</span>
                    </Button>
                    <Input
                      placeholder="Écrivez votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      className="h-11 rounded-xl border-2 focus-visible:ring-christmas-green"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!newMessage.trim() && chatImageUrls.length === 0}
                      className="flex-shrink-0 h-11 px-6 rounded-xl bg-gradient-to-r from-christmas-green to-green-600 hover:from-green-600 hover:to-christmas-green"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modal de détails contribution mobile */}
        <Dialog open={!!selectedContribForDetail} onOpenChange={(open) => !open && setSelectedContribForDetail(null)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            {selectedContribForDetail && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-start gap-4">
                    {selectedContribForDetail.imageUrl && (
                      <Image src={selectedContribForDetail.imageUrl} alt="Photo" className="w-32 h-32 object-cover rounded-md" width={128} height={128} />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedContribForDetail.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <span>{getCategoryIcon(selectedContribForDetail.category || 'autre')}</span>
                        <span className="font-medium">
                          {selectedContribForDetail.category === 'plat' ? 'Plat' : 
                           selectedContribForDetail.category === 'boisson' ? 'Boisson' : 
                          selectedContribForDetail.category === 'décor' ? 'Décoration' :
                          selectedContribForDetail.category === 'ingredient' ? 'Ingrédient' : 'Autre'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
                  <p className="text-gray-700">
                    {selectedContribForDetail.description || 'Aucune description'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Apporté par</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedContribForDetail.assignee?.avatar || '👤'}</span>
                    <span className="text-gray-700">{selectedContribForDetail.assignee?.name || 'Non assigné'}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Statut</h3>
                  <span className={cn('inline-block px-3 py-1 rounded-full text-sm font-medium', getStatusColor(selectedContribForDetail.status))}>
                    {getStatusLabel(selectedContribForDetail.status)}
                  </span>
                </div>

                {selectedContribForDetail.assignee?.id === user?.id && (
                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        handleEditContribution(selectedContribForDetail)
                        setSelectedContribForDetail(null)
                      }}
                    >
                      ✏️ Éditer
                    </Button>
                    {selectedContribForDetail.status !== 'BROUGHT' && (
                      <Button 
                        className="flex-1"
                        onClick={() => {
                          handleUpdateContributionStatus(
                            selectedContribForDetail.id,
                            selectedContribForDetail.status === 'PLANNED' ? 'CONFIRMED' : 'BROUGHT'
                          )
                          setSelectedContribForDetail(null)
                        }}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {selectedContribForDetail.status === 'PLANNED' ? 'Confirmer' : 'Apporté'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
