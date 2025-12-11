'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    status: 'OPEN',
  })

  const loadEvent = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/events/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setEvent(data)
      setFormData({
        name: data.name,
        description: data.description || '',
        date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
        endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
        location: data.location || '',
        status: data.status,
      })
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger l\'événement', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [params.id, toast])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/events/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Erreur')
      toast({ title: 'Événement mis à jour !' })
      router.push('/admin')
    } catch (error) {
      toast({ title: 'Erreur', variant: 'destructive' })
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
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700">
                Enregistrer
              </Button>
              <Button onClick={() => router.push('/admin')} variant="outline" className="flex-1">
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
