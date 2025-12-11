'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, BarChart3 } from 'lucide-react'

export default function PollDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [poll, setPoll] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadPoll = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/polls/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setPoll(data)
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
    if (!confirm('Fermer ce sondage ?')) return
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
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer ce sondage ?')) return
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/polls/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur')
      toast({ title: 'Sondage supprimé !' })
      router.push('/admin')
    } catch (error) {
      toast({ title: 'Erreur', variant: 'destructive' })
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (!poll) return <div className="p-8">Sondage non trouvé</div>

  const totalVotes = poll.votes?.length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin" className="flex items-center gap-2 text-white hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;administration
        </Link>

        <Card className="border-2 border-white mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BarChart3 className="w-6 h-6" />
                  {poll.title}
                </CardTitle>
                <p className="text-muted-foreground mt-2">{poll.description}</p>
                <p className="text-sm mt-2">Événement: {poll.event?.name}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                poll.isClosed ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
              }`}>
                {poll.isClosed ? 'Fermé' : 'Ouvert'}
              </span>
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
    </div>
  )
}
