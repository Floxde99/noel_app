'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Trash2, Loader2, Edit3, Copy } from 'lucide-react'

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    endDate: '',
    endTime: '',
    location: '',
    mapUrl: '',
    status: 'OPEN',
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletingContributionId, setDeletingContributionId] = useState<string | null>(null)
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null)
  const [editingContributionForm, setEditingContributionForm] = useState({
    title: '',
    description: '',
    category: '',
    status: 'PLANNED',
    quantity: 1,
    budget: '',
  })
  const [savingContributionId, setSavingContributionId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    params.then(({ id }) => {
      if (!canceled) {
        setEventId(id)
      }
    })
    return () => {
      canceled = true
    }
  }, [params])

  const loadEvent = useCallback(async () => {
    if (!eventId) return
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `Erreur ${res.status}`)
      }
      setEvent(data)
      const dateObj = data.date ? new Date(data.date) : null
      const endDateObj = data.endDate ? new Date(data.endDate) : null
      setFormData({
        name: data.name,
        description: data.description || '',
        date: dateObj ? dateObj.toISOString().split('T')[0] : '',
        time: dateObj ? dateObj.toTimeString().substring(0, 5) : '',
        endDate: endDateObj ? endDateObj.toISOString().split('T')[0] : '',
        endTime: endDateObj ? endDateObj.toTimeString().substring(0, 5) : '',
        location: data.location || '',
        mapUrl: data.mapUrl || '',
        status: data.status,
      })
    } catch (error) {
      console.error('Erreur chargement événement:', error)
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Impossible de charger l\'événement', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [eventId, toast])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  const handleSave = async () => {
    if (!eventId) return
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
        location: formData.location || null,
        mapUrl: formData.mapUrl || null,
      }
      if (formData.date && formData.time) {
        payload.date = new Date(`${formData.date}T${formData.time}`).toISOString()
      }
      if (formData.endDate && formData.endTime) {
        payload.endDate = new Date(`${formData.endDate}T${formData.endTime}`).toISOString()
      } else if (formData.endDate) {
        payload.endDate = new Date(`${formData.endDate}T00:00`).toISOString()
      }
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Erreur')
      }
      toast({ title: 'Événement mis à jour !' })
      router.push('/admin')
    } catch (error) {
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Erreur interne', variant: 'destructive' })
    }
  }

  const handleDeleteContribution = async (contributionId: string) => {
    if (!eventId) return
    if (!confirm('Supprimer cette contribution ?')) return
    setDeletingContributionId(contributionId)
    try {
      const res = await fetch(`/api/contributions/${contributionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de supprimer')
      }

      toast({ title: 'Contribution supprimée', variant: 'success' })
      await loadEvent()
    } catch (error) {
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Erreur', variant: 'destructive' })
    } finally {
      setDeletingContributionId(null)
    }
  }

  const handleSaveContribution = async () => {
    if (!eventId || !editingContributionId) return
    if (!editingContributionForm.title.trim()) {
      toast({ title: 'Titre requis', description: 'Donnez un titre à la contribution', variant: 'destructive' })
      return
    }

    setSavingContributionId(editingContributionId)
    try {
      const res = await fetch(`/api/contributions/${editingContributionId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingContributionForm.title.trim(),
          description: editingContributionForm.description.trim() || undefined,
          category: editingContributionForm.category.trim() || undefined,
          status: editingContributionForm.status,
          quantity: editingContributionForm.quantity || 1,
          budget: editingContributionForm.budget ? parseFloat(editingContributionForm.budget) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de mettre à jour')
      }

      toast({ title: 'Contribution mise à jour', variant: 'success' })
      setEditingContributionId(null)
      setEditingContributionForm({ title: '', description: '', category: '', status: 'PLANNED', quantity: 1, budget: '' })
      await loadEvent()
    } catch (error) {
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Erreur', variant: 'destructive' })
    } finally {
      setSavingContributionId(null)
    }
  }

  const handleDuplicateContribution = async (contrib: any) => {
    if (!eventId) return
    if (!confirm(`Dupliquer "${contrib.title}" ?`)) return

    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: contrib.title,
          description: contrib.description,
          category: contrib.category,
          eventId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de dupliquer')
      }

      toast({ title: 'Contribution dupliquée ! 📋', variant: 'success' })
      await loadEvent()
    } catch (error) {
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Erreur', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!eventId) return
    if (!confirm('Supprimer définitivement cet événement ? Cette action est irréversible.')) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de supprimer')
      }
      toast({ title: 'Événement supprimé', variant: 'success' })
      router.push('/admin')
    } catch (error) {
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Erreur', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin" className="flex items-center gap-2 text-white hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;administration
        </Link>

        <Card className="border-2 border-white">
          <CardHeader>
            <CardTitle className="text-2xl">Éditer l&apos;événement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Nom</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full mt-2 p-2 border rounded"
                rows={4}
                placeholder="Détails de l'événement..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Heure de début</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de fin (optionnel)</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Heure de fin (optionnel)</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label>Lieu</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="mt-2"
                placeholder="Adresse ou nom du lieu"
              />
            </div>

            <div>
              <Label>Lien Google Maps (optionnel)</Label>
              <Input
                value={formData.mapUrl}
                onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                className="mt-2"
                placeholder="https://maps.google.com/..."
              />
            </div>

            <div>
              <Label>Statut</Label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full mt-2 p-2 border rounded"
              >
                <option value="DRAFT">Brouillon</option>
                <option value="OPEN">Ouvert</option>
                <option value="CLOSED">Fermé</option>
              </select>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Contributions ({event?.contributions?.length ?? 0})</Label>
              </div>
              <div className="mt-3 space-y-3">
                {event?.contributions?.length ? (
                  event.contributions.map((c: any) => {
                    const isEditing = editingContributionId === c.id
                    return (
                      <div key={c.id} className="rounded border p-3">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <Label>Titre</Label>
                              <Input
                                value={editingContributionForm.title}
                                onChange={(e) => setEditingContributionForm((prev) => ({ ...prev, title: e.target.value }))}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Description</Label>
                              <textarea
                                value={editingContributionForm.description}
                                onChange={(e) => setEditingContributionForm((prev) => ({ ...prev, description: e.target.value }))}
                                className="w-full mt-1 p-2 border rounded"
                                rows={2}
                                placeholder="Description (optionnelle)"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Catégorie</Label>
                                <Input
                                  value={editingContributionForm.category}
                                  onChange={(e) => setEditingContributionForm((prev) => ({ ...prev, category: e.target.value }))}
                                  className="mt-1"
                                  placeholder="plat, boisson, ingredient…"
                                />
                              </div>
                              <div>
                                <Label>Statut</Label>
                                <select
                                  value={editingContributionForm.status}
                                  onChange={(e) => setEditingContributionForm((prev) => ({ ...prev, status: e.target.value }))}
                                  className="w-full mt-1 p-2 border rounded"
                                >
                                  <option value="PLANNED">PLANNED</option>
                                  <option value="CONFIRMED">CONFIRMED</option>
                                  <option value="BROUGHT">BROUGHT</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Quantité</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={editingContributionForm.quantity}
                                  onChange={(e) => setEditingContributionForm((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Budget (€)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={editingContributionForm.budget}
                                  onChange={(e) => setEditingContributionForm((prev) => ({ ...prev, budget: e.target.value }))}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingContributionId(null)
                                  setEditingContributionForm({ title: '', description: '', category: '', status: 'PLANNED', quantity: 1, budget: '' })
                                }}
                                disabled={savingContributionId === c.id}
                              >
                                Annuler
                              </Button>
                              <Button
                                onClick={handleSaveContribution}
                                disabled={savingContributionId === c.id}
                              >
                                {savingContributionId === c.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Enregistrer'
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="font-medium truncate">{c.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {(c.category || 'sans catégorie')} • {(c.status || 'PLANNED')}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingContributionId(c.id)
                                  setEditingContributionForm({
                                    title: c.title || '',
                                    description: c.description || '',
                                    category: c.category || '',
                                    status: c.status || 'PLANNED',
                                    quantity: c.quantity || 1,
                                    budget: c.budget?.toString() || '',
                                  })
                                }}
                                aria-label="Modifier la contribution"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDuplicateContribution(c)}
                                aria-label="Dupliquer la contribution"
                              >
                                <Copy className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteContribution(c.id)}
                                disabled={deletingContributionId === c.id}
                                aria-label="Supprimer la contribution"
                              >
                                {deletingContributionId === c.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune contribution pour cet événement.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700">
                Enregistrer
              </Button>
              <Button onClick={() => router.push('/admin')} variant="outline" className="flex-1">
                Annuler
              </Button>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="destructive"
                className="w-full"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer l&apos;événement
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
