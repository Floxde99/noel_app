"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatTime, generateEventCode } from '@/lib/utils'
import {
  ArrowLeft,
  Calendar,
  Users,
  Key,
  BarChart3,
  Plus,
  Trash2,
  Copy,
  Loader2,
  Settings,
  ChefHat,
  ClipboardList,
  Lock,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import QRCode from 'qrcode'

interface Event {
  id: string
  name: string
  date: string
  status: string
  _count: {
    eventUsers: number
    contributions: number
    tasks: number
  }
}

interface EventCode {
  id: string
  code: string
  isActive: boolean
  isMaster: boolean
  events: { event: { id: string; name: string } }[]
}

interface User {
  id: string
  name: string
  email?: string
  role: string
  avatar?: string
  _count: { eventUsers: number }
}

interface Poll {
  id: string
  title: string
  isClosed: boolean
  eventId: string
  event: { name: string }
  _count: { votes: number }
}

interface MenuRecipe {
  id: string
  title: string
  description?: string | null
  eventId: string
  _count?: { ingredients: number }
}

export default function AdminPage() {
  const { user, isLoading: authLoading, isAuthenticated, accessToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const isAdmin = user?.role === 'ADMIN'
  
  const [activeTab, setActiveTab] = useState<'events' | 'codes' | 'users' | 'polls' | 'messages' | 'menu'>(isAdmin ? 'events' : 'menu')
  const [events, setEvents] = useState<Event[]>([])
  const [codes, setCodes] = useState<EventCode[]>([])
  const [qrImages, setQrImages] = useState<Record<string, string>>({})
  const [qrLoading, setQrLoading] = useState<Record<string, boolean>>({})
  const [users, setUsers] = useState<User[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [menuRecipes, setMenuRecipes] = useState<MenuRecipe[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [newRecipe, setNewRecipe] = useState({ title: '', description: '' })
  const [isLoading, setIsLoading] = useState(true)

  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    variant?: 'danger' | 'warning' | 'info'
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })

  // Form states
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    location: '',
  })
  const [newCode, setNewCode] = useState({
    code: '',
    eventIds: [] as string[],
    isMaster: false,
  })
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    eventId: '',
    options: ['', ''],
  })
  const [newUser, setNewUser] = useState<{ name: string; email?: string; role: 'USER' | 'ADMIN' }>({
    name: '',
    email: '',
    role: 'USER',
  })

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (!searchParams) return
    const tab = searchParams.get('tab')
    if (tab === 'menu') setActiveTab('menu')
  }, [searchParams])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined

      if (isAdmin) {
        const [eventsRes, codesRes, usersRes, pollsRes, messagesRes] = await Promise.all([
          fetch('/api/admin/events', { credentials: 'include', headers }),
          fetch('/api/admin/codes', { credentials: 'include', headers }),
          fetch('/api/admin/users', { credentials: 'include', headers }),
          fetch('/api/admin/polls', { credentials: 'include', headers }),
          fetch('/api/admin/messages', { credentials: 'include', headers }),
        ])

        if (eventsRes.ok) {
          const data = await eventsRes.json()
          setEvents(data.events || [])
        }
        if (codesRes.ok) {
          const data = await codesRes.json()
          setCodes(data.codes || [])
        }
        if (usersRes.ok) {
          const data = await usersRes.json()
          setUsers(Array.isArray(data) ? data : (data.users || []))
        }
        if (pollsRes.ok) {
          const data = await pollsRes.json()
          setPolls(Array.isArray(data) ? data : (data.polls || []))
        }
        if (messagesRes.ok) {
          const data = await messagesRes.json()
          setMessages(Array.isArray(data) ? data : data.messages || [])
        }
      } else {
        const eventsRes = await fetch('/api/events', { credentials: 'include', headers })
        if (eventsRes.ok) {
          const data = await eventsRes.json()
          const mapped: Event[] = (data.events || []).map((e: any) => ({
            id: e.id,
            name: e.name,
            date: e.date,
            status: e.status,
            _count: {
              eventUsers: e.participantCount ?? 0,
              contributions: e.contributionCount ?? 0,
              tasks: e.taskCount ?? 0,
            },
          }))
          setEvents(mapped)
        }
        setCodes([])
        setUsers([])
        setPolls([])
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, isAdmin])

  useEffect(() => {
    if (isAuthenticated) fetchData()
  }, [isAuthenticated, fetchData])

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id)
    }
  }, [events, selectedEventId])

  const fetchMenu = useCallback(async (eventId: string) => {
    if (!eventId) return
    try {
      const res = await fetch(`/api/menu?eventId=${eventId}`, { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de charger le menu')
      }
      const data = await res.json()
      setMenuRecipes(data.recipes || [])
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur', variant: 'destructive' })
    }
  }, [toast])

  useEffect(() => {
    if (activeTab === 'menu' && selectedEventId) {
      fetchMenu(selectedEventId)
    }
  }, [activeTab, selectedEventId, fetchMenu])

  const handleCreateRecipe = async () => {
    if (!selectedEventId) {
      toast({ title: 'Sélectionnez un événement', variant: 'destructive' })
      return
    }
    if (!newRecipe.title.trim()) {
      toast({ title: 'Titre requis', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId: selectedEventId,
          title: newRecipe.title.trim(),
          description: newRecipe.description.trim() ? newRecipe.description.trim() : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de créer la recette')
      }
      toast({ title: 'Recette créée', variant: 'success' })
      setNewRecipe({ title: '', description: '' })
      fetchMenu(selectedEventId)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur', variant: 'destructive' })
    }
  }

  const handleDeleteRecipe = async (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Supprimer la recette',
      description: 'Êtes-vous sûr de vouloir supprimer cette recette ?',
      variant: 'danger',
      onConfirm: async () => {
        try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de supprimer la recette')
      }
          toast({ title: 'Recette supprimée', variant: 'success' })
          fetchMenu(selectedEventId)
        } catch (e) {
          toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur', variant: 'destructive' })
        }
      },
    })
  }

  // Handlers
  const handleCreateEvent = async () => {
    if (!newEvent.name || !newEvent.date || !newEvent.time) {
      toast({ title: 'Champs requis', description: 'Nom, date et heure sont obligatoires', variant: 'destructive' })
      return
    }

    try {
      const datetime = new Date(`${newEvent.date}T${newEvent.time}`)
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newEvent.name,
          description: newEvent.description,
          date: datetime.toISOString(),
          location: newEvent.location,
          status: 'OPEN',
        }),
      })

      if (response.ok) {
        toast({ title: 'Événement créé ! 🎄', variant: 'success' })
        setNewEvent({ name: '', description: '', date: '', time: '', location: '' })
        fetchData()
      } else {
        const data = await response.json()
        toast({ 
          title: 'Erreur', 
          description: data.error || 'Impossible de créer l\'événement', 
          variant: 'destructive' 
        })
      }
    } catch (error) {
      console.error('Create event error:', error)
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' })
    }
  }

  const handleCreateCode = async () => {
    if (!newCode.code || !newCode.eventIds.length) {
      toast({ title: 'Champs requis', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newCode),
      })

      if (response.ok) {
        toast({ title: 'Code créé ! 🔑', variant: 'success' })
        setNewCode({ code: '', eventIds: [], isMaster: false })
        fetchData()
      } else {
        const data = await response.json()
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erreur', variant: 'destructive' })
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.name.trim()) {
      toast({ title: 'Nom requis', variant: 'destructive' })
      return
    }
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(newUser),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Impossible de créer l'utilisateur")
      }
      toast({ title: 'Utilisateur créé ✅', variant: 'success' })
      setNewUser({ name: '', email: '', role: 'USER' })
      fetchData()
    } catch (error) {
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue', variant: 'destructive' })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Supprimer l\'utilisateur',
      description: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
      variant: 'danger',
      onConfirm: async () => {
        try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Impossible de supprimer l'utilisateur")
      }
          toast({ title: 'Utilisateur supprimé ✅', variant: 'success' })
          fetchData()
        } catch (error) {
          toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue', variant: 'destructive' })
        }
      },
    })
  }

  const handleDeleteCode = async (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Supprimer le code',
      description: 'Êtes-vous sûr de vouloir supprimer ce code d\'accès ?',
      variant: 'danger',
      onConfirm: async () => {
        try {
      const response = await fetch(`/api/admin/codes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }
          toast({ title: 'Code supprimé ✅', variant: 'success' })
          fetchData()
        } catch (error) {
          console.error('Delete code error:', error)
          toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Impossible de supprimer le code', variant: 'destructive' })
        }
      },
    })
  }

  const handleClosePoll = async (pollId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Fermer le sondage',
      description: 'Les 2 options les plus votées seront ajoutées aux contributions. Voulez-vous continuer ?',
      variant: 'warning',
      onConfirm: async () => {
        try {
      const response = await fetch(`/api/polls/${pollId}/close`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
          toast({
            title: 'Sondage fermé ! 📊',
            description: data.message,
            variant: 'success',
          })
          fetchData()
        }
      } catch (error) {
        toast({ title: 'Erreur', variant: 'destructive' })
      }
      },
    })
  }

  const handleDeleteMessage = async (messageId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Supprimer le message',
      description: 'Êtes-vous sûr de vouloir supprimer ce message ?',
      variant: 'danger',
      onConfirm: async () => {
        try {
      const response = await fetch(`/api/admin/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      })

          if (response.ok) {
            toast({ title: 'Message supprimé ✅', variant: 'success' })
            fetchData()
          } else {
            const data = await response.json()
            throw new Error(data.error || 'Impossible de supprimer le message')
          }
        } catch (error) {
          console.error('Error deleting message:', error)
          toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue', variant: 'destructive' })
        }
      },
    })
  }

  const handleCreatePoll = async () => {
    if (!newPoll.title || !newPoll.eventId || newPoll.options.filter(o => o.trim()).length < 2) {
      toast({ title: 'Champs requis', description: 'Titre, événement et au moins 2 options', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newPoll.title,
          description: newPoll.description,
          eventId: newPoll.eventId,
          type: 'SINGLE',
          options: newPoll.options.filter(o => o.trim()).map(label => ({ label })),
        }),
      })

      if (response.ok) {
        toast({ title: 'Sondage créé ! 📊', variant: 'success' })
        setNewPoll({ title: '', description: '', eventId: '', options: ['', ''] })
        fetchData()
      }
    } catch (error) {
      toast({ title: 'Erreur', variant: 'destructive' })
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({ title: 'Code copié ! 📋' })
  }

  const buildCodeUrl = (code: string) => `${window.location.origin}/login?code=${encodeURIComponent(code)}`

  const generateQrForCode = async (code: string) => {
    try {
      setQrLoading((prev) => ({ ...prev, [code]: true }))
      const dataUrl = await QRCode.toDataURL(buildCodeUrl(code), {
        margin: 1,
        width: 260,
      })
      setQrImages((prev) => ({ ...prev, [code]: dataUrl }))
    } catch (error) {
      console.error('QR generation error', error)
      toast({ title: 'Erreur', description: 'Impossible de générer le QR', variant: 'destructive' })
    } finally {
      setQrLoading((prev) => ({ ...prev, [code]: false }))
    }
  }

  const downloadQr = (code: string) => {
    const dataUrl = qrImages[code]
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `code-${code}.png`
    a.click()
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

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b-2 border-christmas-red shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-5 w-5" />
                Retour
              </Button>
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {isAdmin ? 'Administration' : 'Menu'}
            </h1>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link href="/admin/metrics">
                  <Button variant="outline" className="gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Métriques
                  </Button>
                </Link>
              )}
              <Button variant="ghost" onClick={fetchData}>
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(
            isAdmin
              ? [
                  { id: 'events', label: 'Événements', icon: Calendar, count: events?.length || 0 },
                  { id: 'menu', label: 'Menu prévu', icon: ChefHat, count: menuRecipes?.length || 0 },
                  { id: 'codes', label: 'Codes', icon: Key, count: codes?.length || 0 },
                  { id: 'users', label: 'Utilisateurs', icon: Users, count: users?.length || 0 },
                  { id: 'polls', label: 'Sondages', icon: BarChart3, count: polls?.length || 0 },
                  { id: 'messages', label: 'Messages', icon: Lock, count: messages?.length || 0 },
                ]
              : [
                  { id: 'menu', label: 'Menu prévu', icon: ChefHat, count: menuRecipes?.length || 0 },
                ]
          ).map((tab) => (
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

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-2 border-christmas-red">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Menu prévu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Événement</Label>
                  <select
                    className="w-full h-12 px-3 rounded-lg border-2 text-lg"
                    value={selectedEventId}
                    onChange={(e) => {
                      setSelectedEventId(e.target.value)
                      fetchMenu(e.target.value)
                    }}
                  >
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Nouvelle recette</Label>
                  <Input
                    placeholder="Ex: Gratin dauphinois"
                    value={newRecipe.title}
                    onChange={(e) => setNewRecipe({ ...newRecipe, title: e.target.value })}
                  />
                  <Input
                    placeholder="Description (optionnel)"
                    value={newRecipe.description}
                    onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
                  />
                  <Button onClick={handleCreateRecipe} className="w-full">
                    Créer la recette
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-christmas-red">
              <CardHeader>
                <CardTitle>Recettes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {menuRecipes.length === 0 ? (
                    <p className="text-muted-foreground">Aucune recette pour l’instant.</p>
                  ) : (
                    menuRecipes.map((r) => (
                      <div key={r.id} className="p-3 border rounded-lg flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {r._count?.ingredients ?? 0} ingrédient(s)
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/admin/menu/${r.id}`}>
                            <Button variant="outline">Ouvrir</Button>
                          </Link>
                          <Button variant="outline" onClick={() => handleDeleteRecipe(r.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Events Tab */}
        {isAdmin && activeTab === 'events' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-2 border-christmas-red">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Créer un événement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de l’événement</Label>
                  <Input
                    placeholder="Ex: Réveillon de Noël"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Description..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Heure</Label>
                    <Input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Lieu</Label>
                  <Input
                    placeholder="Adresse..."
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateEvent} className="w-full">
                  Créer l’événement
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-christmas-red">
              <CardHeader>
                <CardTitle>Événements existants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="p-3 border rounded-lg flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{event.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(event.date, { weekday: undefined })} à {formatTime(event.date)}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
                          <span>{event._count.eventUsers} participants</span>
                          <span>{event._count.contributions} contributions</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-1 rounded text-xs ${
                          event.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                        }`}>
                          {event.status}
                        </span>
                        <Link href={`/admin/events/${event.id}`}>
                          <Button size="sm" variant="outline">Éditer</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Codes Tab */}
        {isAdmin && activeTab === 'codes' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-2 border-christmas-red">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Créer un code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: NOEL-2025-SOIR"
                      value={newCode.code}
                      onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setNewCode({ ...newCode, code: generateEventCode() })}
                    >
                      Générer
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Événements (sélectionner un ou plusieurs)</Label>
                  <div className="space-y-2 border-2 border-christmas-red rounded-lg p-3 max-h-48 overflow-y-auto">
                    {events.map((event) => (
                      <label key={event.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          className="h-5 w-5 text-christmas-red"
                          checked={newCode.eventIds.includes(event.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewCode({ ...newCode, eventIds: [...newCode.eventIds, event.id] })
                            } else {
                              setNewCode({ ...newCode, eventIds: newCode.eventIds.filter(id => id !== event.id) })
                            }
                          }}
                        />
                        <span className="text-sm">{event.name}</span>
                      </label>
                    ))}
                  </div>
                  {newCode.eventIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {newCode.eventIds.length} événement(s) sélectionné(s)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isMaster"
                    checked={newCode.isMaster}
                    onChange={(e) => setNewCode({ ...newCode, isMaster: e.target.checked })}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="isMaster">Code maître (accès à tous les événements)</Label>
                </div>
                <Button onClick={handleCreateCode} className="w-full">
                  Créer le code
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-christmas-red">
              <CardHeader>
                <CardTitle>Codes existants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {codes.map((code) => (
                    <div key={code.id} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono font-medium flex items-center gap-2">
                            {code.code}
                            {code.isMaster && <Lock className="h-4 w-4 text-christmas-gold" />}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {code.events.map(ce => ce.event.name).join(' • ')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => copyCode(code.code)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => generateQrForCode(code.code)} disabled={qrLoading[code.code]}>
                            {qrLoading[code.code] ? <Loader2 className="h-4 w-4 animate-spin" /> : 'QR'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteCode(code.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {qrImages[code.code] && (
                        <div className="flex items-center gap-4">
                          <Image
                            src={qrImages[code.code]}
                            alt={`QR pour ${code.code}`}
                            width={96}
                            height={96}
                            className="w-24 h-24 border rounded"
                          />
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div>Scan pour pré-remplir le code sur la page login.</div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => downloadQr(code.code)}>
                                Télécharger PNG
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => copyCode(buildCodeUrl(code.code))}>
                                Copier le lien
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {isAdmin && activeTab === 'users' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-2 border-christmas-red">
              <CardHeader>
                <CardTitle>Créer un utilisateur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    placeholder="Nom complet"
                    value={(newUser as any)?.name || ''}
                    onChange={(e) => setNewUser({ ...(newUser as any), name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email (optionnel)</Label>
                  <Input
                    placeholder="email@example.com"
                    value={(newUser as any)?.email || ''}
                    onChange={(e) => setNewUser({ ...(newUser as any), email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <select
                    className="w-full h-12 px-3 rounded-lg border-2 border-christmas-red"
                    value={(newUser as any)?.role || 'USER'}
                    onChange={(e) => setNewUser({ ...(newUser as any), role: e.target.value })}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <Button onClick={handleCreateUser} className="w-full">Créer l&apos;utilisateur</Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-christmas-red">
              <CardHeader>
                <CardTitle>Utilisateurs ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {users.map((u) => (
                    <div key={u.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{u.avatar || '👤'}</span>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {u.email || 'Pas d\'email'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {u._count.eventUsers} événement(s)
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${u.role === 'ADMIN' ? 'bg-christmas-gold/20 text-christmas-gold' : 'bg-gray-100'}`}>
                          {u.role}
                        </span>
                        <Link href={`/admin/users/${u.id}`} className="text-sm underline">Éditer</Link>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(u.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Polls Tab */}
        {isAdmin && activeTab === 'polls' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-2 border-christmas-red">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Créer un sondage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input
                    placeholder="Ex: Quel dessert préférez-vous ?"
                    value={newPoll.title}
                    onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Événement</Label>
                  <select
                    className="w-full h-12 px-3 rounded-lg border-2 border-christmas-red"
                    value={newPoll.eventId}
                    onChange={(e) => setNewPoll({ ...newPoll, eventId: e.target.value })}
                  >
                    <option value="">Sélectionner...</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Options</Label>
                  {newPoll.options.map((opt, i) => (
                    <Input
                      key={i}
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const opts = [...newPoll.options]
                        opts[i] = e.target.value
                        setNewPoll({ ...newPoll, options: opts })
                      }}
                    />
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewPoll({ ...newPoll, options: [...newPoll.options, ''] })}
                  >
                    + Ajouter une option
                  </Button>
                </div>
                <Button onClick={handleCreatePoll} className="w-full">
                  Créer le sondage
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-christmas-red">
              <CardHeader>
                <CardTitle>Sondages existants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {polls.length === 0 ? (
                    <p className="text-muted-foreground">Aucun sondage pour l&apos;instant.</p>
                  ) : (
                    polls.map((poll) => (
                    <div key={poll.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{poll.title}</div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          poll.isClosed ? 'bg-gray-100' : 'bg-green-100 text-green-800'
                        }`}>
                          {poll.isClosed ? 'Fermé' : 'Ouvert'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {poll.event.name} • {poll._count.votes} votes
                      </div>
                      <div className="flex gap-2">
                        {!poll.isClosed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleClosePoll(poll.id)}
                          >
                            Fermer et créer contributions
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setConfirmDialog({
                              open: true,
                              title: 'Supprimer le sondage',
                              description: `Êtes-vous sûr de vouloir supprimer le sondage "${poll.title}" ?`,
                              variant: 'danger',
                              onConfirm: async () => {
                                try {
                                  const response = await fetch(`/api/admin/polls/${poll.id}`, {
                                    method: 'DELETE',
                                    credentials: 'include',
                                    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                                  })
                                  if (!response.ok) throw new Error('Erreur')
                                  toast({ title: 'Sondage supprimé ✅', variant: 'success' })
                                  fetchData()
                                } catch (error) {
                                  toast({ title: 'Erreur', variant: 'destructive' })
                                }
                              },
                            })
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Messages Tab */}
        {isAdmin && activeTab === 'messages' && (
          <Card className="border-2 border-christmas-red">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Modération des Messages ({messages.length})
              </CardTitle>
              <CardDescription>Supprimez les messages inappropriés</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-muted-foreground">Aucun message</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">
                            {msg.user?.name || 'Utilisateur supprimé'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {msg.event?.name} • {new Date(msg.createdAt).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm py-2 break-words">{msg.content}</p>
                      {msg.media && msg.media.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {msg.media.length} image(s) attachée(s)
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="mt-2"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer le message
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
      />
    </div>
  )
}
