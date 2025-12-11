"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  RefreshCw
} from 'lucide-react'

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

export default function AdminPage() {
  const { user, isLoading: authLoading, isAuthenticated, accessToken } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState<'events' | 'codes' | 'users' | 'polls' | 'messages'>('events')
  const [events, setEvents] = useState<Event[]>([])
  const [codes, setCodes] = useState<EventCode[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    if (!authLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.push('/dashboard')
    }
  }, [authLoading, isAuthenticated, user, router])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
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
        setPolls(data.polls || [])
      }
      if (messagesRes.ok) {
        const data = await messagesRes.json()
        setMessages(Array.isArray(data) ? data : data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchData()
    }
  }, [isAuthenticated, user, fetchData])

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
    if (!confirm('Supprimer cet utilisateur ?')) return
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
  }

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Supprimer ce code ?')) return

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
  }

  const handleClosePoll = async (pollId: string) => {
    if (!confirm('Fermer ce sondage ? Les 2 options les plus votées seront ajoutées aux contributions.')) return

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
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Supprimer ce message ?')) return

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

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-christmas-red" />
      </div>
    )
  }

  if (user?.role !== 'ADMIN') {
    return null
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
              Administration
            </h1>
            <Button variant="ghost" onClick={fetchData}>
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'events', label: 'Événements', icon: Calendar, count: events?.length || 0 },
            { id: 'codes', label: 'Codes', icon: Key, count: codes?.length || 0 },
            { id: 'users', label: 'Utilisateurs', icon: Users, count: users?.length || 0 },
            { id: 'polls', label: 'Sondages', icon: BarChart3, count: polls?.length || 0 },
            { id: 'messages', label: 'Messages', icon: Lock, count: messages?.length || 0 },
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

        {/* Events Tab */}
        {activeTab === 'events' && (
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
                    <div key={event.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-medium">{event.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(event.date, { weekday: undefined })} à {formatTime(event.date)}
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-3 mt-1">
                          <span>{event._count.eventUsers} participants</span>
                          <span>{event._count.contributions} contributions</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        event.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Codes Tab */}
        {activeTab === 'codes' && (
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
                    <div key={code.id} className="p-3 border rounded-lg flex items-center justify-between">
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
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteCode(code.id)}>
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

        {/* Users Tab */}
        {activeTab === 'users' && (
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
                <Button onClick={handleCreateUser} className="w-full">Créer l'utilisateur</Button>
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
        {activeTab === 'polls' && (
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
                  {polls.map((poll) => (
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
                      {!poll.isClosed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClosePoll(poll.id)}
                        >
                          Fermer et créer contributions
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
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
    </div>
  )
}
