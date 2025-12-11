'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
    role: 'USER',
  })

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/users/${id}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setUser(data)
      setFormData({
        name: data.name,
        email: data.email || '',
        avatar: data.avatar || '',
        role: data.role,
      })
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger l\'utilisateur', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Erreur')
      toast({ title: 'Utilisateur mis à jour !' })
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
            <CardTitle className="text-2xl">Éditer l&apos;utilisateur</CardTitle>
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
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Avatar (emoji)</Label>
              <Input
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="Ex: 👤"
                className="mt-2"
                maxLength={2}
              />
            </div>

            <div>
              <Label>Rôle</Label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full mt-2 p-2 border rounded"
              >
                <option value="USER">Utilisateur</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </div>

            {user?.eventUsers && (
              <div>
                <Label>Événements ({user.eventUsers.length})</Label>
                <div className="mt-2 space-y-1">
                  {user.eventUsers.map((eu: any) => (
                    <div key={eu.id} className="text-sm p-2 bg-gray-100 rounded">
                      {eu.event.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
