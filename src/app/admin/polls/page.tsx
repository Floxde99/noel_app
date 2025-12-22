'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { fetchWithAuth } from '@/lib/utils'
import { ArrowLeft, BarChart3, Plus, X, Edit, Trash2, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type Poll = {
  id: string
  title: string
  description?: string
  type: 'SINGLE' | 'MULTIPLE'
  imageUrl?: string
  isClosed: boolean
  createdAt: string
  event: { id: string; name: string }
  createdBy: { id: string; name: string }
  _count: { votes: number; options: number }
}

type Event = {
  id: string
  name: string
  date: string
}

export default function AdminPollsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [polls, setPolls] = useState<Poll[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'SINGLE' as 'SINGLE' | 'MULTIPLE',
    eventId: '',
    options: ['', ''],
  })

  const loadData = useCallback(async () => {
    try {
      const [pollsRes, eventsRes] = await Promise.all([
        fetchWithAuth('/api/admin/polls'),
        fetchWithAuth('/api/admin/events'),
      ])

      if (pollsRes.ok) {
        const pollsData = await pollsRes.json()
        setPolls(pollsData)
      }
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setEvents(eventsData)
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les données', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault()

    const options = formData.options.filter((opt) => opt.trim() !== '')
    if (options.length < 2) {
      toast({ title: 'Erreur', description: 'Au moins 2 options sont requises', variant: 'destructive' })
      return
    }

    try {
      const res = await fetchWithAuth('/api/admin/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          type: formData.type,
          eventId: formData.eventId,
          options: options.map((label) => ({ label })),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erreur')
      }

      toast({ title: 'Sondage créé !', description: 'Le sondage a été créé avec succès' })
      setIsCreateOpen(false)
      setFormData({ title: '', description: '', type: 'SINGLE', eventId: '', options: ['', ''] })
      loadData()
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    }
  }

  const handleDeletePoll = async (id: string, title: string) => {
    setConfirmDialog({
      open: true,
      title: 'Supprimer le sondage',
      description: `Êtes-vous sûr de vouloir supprimer le sondage "${title}" ?`,
      onConfirm: async () => {
        try {
          const res = await fetchWithAuth(`/api/admin/polls/${id}`, {
            method: 'DELETE',
          })

          if (!res.ok) throw new Error('Erreur')

          toast({ title: 'Sondage supprimé !', description: 'Le sondage a été supprimé avec succès' })
          loadData()
        } catch (error) {
          toast({ title: 'Erreur', description: 'Impossible de supprimer le sondage', variant: 'destructive' })
        }
      },
    })
  }

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, ''] })
  }

  const removeOption = (index: number) => {
    setFormData({ ...formData, options: formData.options.filter((_, i) => i !== index) })
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  const filteredPolls = polls.filter(
    (poll) =>
      poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      poll.event.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center">
        <p className="text-white text-xl">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="flex items-center gap-2 text-white hover:underline mb-4">
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;administration
          </Link>

          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-10 h-10" />
              Gestion des Sondages
            </h1>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-red-900 hover:bg-gray-100">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un sondage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Créer un nouveau sondage</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePoll} className="space-y-4">
                  {/* Event Selection */}
                  <div>
                    <Label htmlFor="eventId">Événement *</Label>
                    <Select value={formData.eventId} onValueChange={(v) => setFormData({ ...formData, eventId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un événement" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Title */}
                  <div>
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Titre du sondage"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description (optionnelle)"
                      rows={3}
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v as 'SINGLE' | 'MULTIPLE' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE">Choix unique</SelectItem>
                        <SelectItem value="MULTIPLE">Choix multiples</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Options */}
                  <div>
                    <Label>Options * (minimum 2)</Label>
                    <div className="space-y-2 mt-2">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            required
                          />
                          {formData.options.length > 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeOption(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addOption} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une option
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      Créer le sondage
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            type="search"
            placeholder="Rechercher un sondage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md bg-white"
          />
        </div>

        {/* Polls List */}
        {filteredPolls.length === 0 ? (
          <Card className="border-2 border-white">
            <CardContent className="p-8 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg">
                {searchQuery ? 'Aucun sondage trouvé' : 'Aucun sondage créé'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPolls.map((poll) => (
              <Card key={poll.id} className="border-2 border-white hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{poll.title}</CardTitle>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        poll.isClosed ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                      }`}
                    >
                      {poll.isClosed ? 'Fermé' : 'Actif'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Event */}
                  <div className="text-sm">
                    <span className="font-semibold">Événement:</span> {poll.event.name}
                  </div>

                  {/* Description */}
                  {poll.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{poll.description}</p>
                  )}

                  {/* Stats */}
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>🗳️ {poll._count.votes} votes</span>
                    <span>📊 {poll._count.options} options</span>
                  </div>

                  {/* Type */}
                  <div className="text-xs text-gray-500">
                    {poll.type === 'SINGLE' ? 'Choix unique' : 'Choix multiples'}
                  </div>

                  {/* Creator */}
                  <div className="text-xs text-gray-500">
                    Créé par: {poll.createdBy.name}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/admin/polls/${poll.id}`)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Voir
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeletePoll(poll.id, poll.title)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="danger"
      />
    </div>
  )
}
