'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, BarChart3, Edit, Plus, X } from 'lucide-react'

export default function PollDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [poll, setPoll] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    variant?: 'danger' | 'warning'
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })

  // Edit form state
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    type: 'SINGLE' as 'SINGLE' | 'MULTIPLE',
    options: [] as { id?: string; label: string }[],
  })

  const loadPoll = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/polls/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setPoll(data)
      
      // Initialize edit form with poll data
      setEditData({
        title: data.title,
        description: data.description || '',
        type: data.type,
        options: data.options?.map((opt: any) => ({ id: opt.id, label: opt.label })) || [],
      })
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger le sondage', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [params.id, toast])

  useEffect(() => {
    loadPoll()
  }, [loadPoll])

  const handleClose = async () => {
    setConfirmDialog({
      open: true,
      title: 'Fermer le sondage',
      description: 'Êtes-vous sûr de vouloir fermer ce sondage ?',
      variant: 'warning',
      onConfirm: async () => {
        try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/polls/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isClosed: true }),
      })
      if (!res.ok) throw new Error('Erreur')
          toast({ title: 'Sondage fermé !' })
          loadPoll()
        } catch (error) {
          toast({ title: 'Erreur', variant: 'destructive' })
        }
      },
    })
  }

  const handleDelete = async () => {
    setConfirmDialog({
      open: true,
      title: 'Supprimer le sondage',
      description: 'Êtes-vous sûr de vouloir supprimer définitivement ce sondage ?',
      variant: 'danger',
      onConfirm: async () => {
        try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/polls/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur')
          toast({ title: 'Sondage supprimé !' })
          router.push('/admin/polls')
        } catch (error) {
          toast({ title: 'Erreur', variant: 'destructive' })
        }
      },
    })
  }

  const handleEditPoll = async (e: React.FormEvent) => {
    e.preventDefault()

    const options = editData.options.filter((opt) => opt.label.trim() !== '')
    if (options.length < 2) {
      toast({ title: 'Erreur', description: 'Au moins 2 options sont requises', variant: 'destructive' })
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/polls/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editData.title,
          description: editData.description || null,
          type: editData.type,
          options: options.map((opt) => ({ label: opt.label })),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erreur')
      }

      toast({ title: 'Sondage modifié !', description: 'Les modifications ont été enregistrées' })
      setIsEditOpen(false)
      loadPoll()
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
    }
  }

  const addOption = () => {
    setEditData({ ...editData, options: [...editData.options, { label: '' }] })
  }

  const removeOption = (index: number) => {
    setEditData({ ...editData, options: editData.options.filter((_, i) => i !== index) })
  }

  const updateOption = (index: number, label: string) => {
    const newOptions = [...editData.options]
    newOptions[index] = { ...newOptions[index], label }
    setEditData({ ...editData, options: newOptions })
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (!poll) return <div className="p-8">Sondage non trouvé</div>

  const totalVotes = poll.votes?.length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/polls" className="flex items-center gap-2 text-white hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour aux sondages
        </Link>

        {/* Poll Header with Edit Button */}
        <Card className="border-2 border-white mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BarChart3 className="w-6 h-6" />
                  {poll.title}
                </CardTitle>
                <p className="text-muted-foreground mt-2">{poll.description}</p>
                <p className="text-sm mt-2">Événement: {poll.event?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${
                  poll.isClosed ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                }`}>
                  {poll.isClosed ? 'Fermé' : 'Ouvert'}
                </span>
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      Modifier
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Modifier le sondage</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditPoll} className="space-y-4">
                      {/* Title */}
                      <div>
                        <Label htmlFor="title">Titre *</Label>
                        <Input
                          id="title"
                          value={editData.title}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          required
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                          rows={3}
                        />
                      </div>

                      {/* Type */}
                      <div>
                        <Label htmlFor="type">Type *</Label>
                        <Select
                          value={editData.type}
                          onValueChange={(v) => setEditData({ ...editData, type: v as 'SINGLE' | 'MULTIPLE' })}
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
                          {editData.options.map((option, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={option.label}
                                onChange={(e) => updateOption(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                required
                              />
                              {editData.options.length > 2 && (
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
                        <p className="text-xs text-muted-foreground mt-2">
                          ⚠️ Modifier les options réinitialisera tous les votes existants
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4">
                        <Button type="submit" className="flex-1">
                          Enregistrer
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditOpen(false)}
                        >
                          Annuler
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-2 border-white mb-6">
          <CardHeader>
            <CardTitle>Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {poll.options?.map((option: any) => {
              const votes = poll.votes?.filter((v: any) => v.optionId === option.id) || []
              const percentage = totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0
              return (
                <div key={option.id}>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {votes.length} vote(s) ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold">Total: {totalVotes} vote(s)</p>
            </div>
          </CardContent>
        </Card>

        {totalVotes > 0 && (
          <Card className="border-2 border-white mb-6">
            <CardHeader>
              <CardTitle>Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {poll.votes?.map((vote: any) => (
                  <div key={vote.id} className="flex justify-between text-sm p-2 bg-gray-100 rounded">
                    <span>{vote.user?.name || 'Utilisateur supprimé'}</span>
                    <span className="text-muted-foreground">
                      pour &quot;{vote.option?.label}&quot;
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          {!poll.isClosed && (
            <Button onClick={handleClose} className="flex-1 bg-blue-600 hover:bg-blue-700">
              Fermer le sondage
            </Button>
          )}
          <Button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700">
            Supprimer
          </Button>
          <Button onClick={() => router.push('/admin')} variant="outline" className="flex-1">
            Retour
          </Button>
        </div>
      </div>

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
