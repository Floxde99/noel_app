"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useFontSize } from '@/components/providers/font-size-provider'
import { formatDate, formatTime, getRelativeTime } from '@/lib/utils'
import { 
  TreePine, 
  Calendar, 
  MapPin, 
  Users, 
  Gift, 
  ChefHat,
  LogOut,
  User,
  Settings,
  Plus,
  Minus,
  Loader2,
  Sparkles
} from 'lucide-react'

interface Event {
  id: string
  name: string
  description?: string
  date: string
  endDate?: string
  location?: string
  mapUrl?: string
  status: 'DRAFT' | 'OPEN' | 'CLOSED'
  participantCount: number
  contributionCount: number
  taskCount: number
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { fontSize, increaseFontSize, decreaseFontSize } = useFontSize()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events', {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setEvents(data.events)
        } else if (response.status === 401) {
          router.push('/login')
        }
      } catch (error) {
        console.error('Failed to fetch events:', error)
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les événements',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchEvents()
    }
  }, [isAuthenticated, router, toast])

  const handleLogout = async () => {
    await logout()
    toast({
      title: 'Déconnexion',
      description: 'À bientôt ! 🎄',
    })
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
          <p className="text-xl text-white font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <Sparkles className="h-4 w-4 mr-1" />
            Ouvert
          </span>
        )
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Terminé
          </span>
        )
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            Brouillon
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b-2 border-christmas-red/20 shadow-sm text-black">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TreePine className="h-8 w-8 text-christmas-green" />
              <h1 className="text-2xl font-bold text-christmas-red">
                Noël en Famille
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Font size controls */}
              <div className="hidden sm:flex items-center gap-2 bg-muted rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={decreaseFontSize}
                  aria-label="Réduire la taille du texte"
                  className="h-8 w-8"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">Aa</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={increaseFontSize}
                  aria-label="Augmenter la taille du texte"
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* User menu */}
              <div className="flex items-center gap-3">
                <Link href="/profile">
                  <Button variant="ghost" className="gap-2">
                    <span className="text-2xl">{user?.avatar || '👤'}</span>
                    <span className="hidden sm:inline">{user?.name}</span>
                  </Button>
                </Link>
                
                {user?.role === 'ADMIN' && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Button>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Se déconnecter"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome section */}
          <div className="text-center space-y-2 text-white drop-shadow-md">
            <h2 className="text-3xl font-bold">
              Bonjour {user?.name} ! 👋
            </h2>
            <p className="text-xl text-white/90 font-medium">
              Voici vos événements de Noël
            </p>
          </div>

          {/* Events grid */}
          {events.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Gift className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-2xl font-semibold mb-2">
                  Pas encore d’événement
                </h3>
                <p className="text-lg text-muted-foreground">
                  Demandez un code d’événement à l’organisateur pour rejoindre une fête !
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="h-full hover:shadow-xl transition-all hover:scale-[1.02] border-2 hover:border-christmas-red/40 cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl leading-tight">
                          {event.name}
                        </CardTitle>
                        {getStatusBadge(event.status)}
                      </div>
                      <CardDescription className="text-base">
                        {event.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Date & Time */}
                      <div className="flex items-center gap-3 text-lg">
                        <Calendar className="h-5 w-5 text-christmas-red flex-shrink-0" />
                        <div>
                          <div className="font-medium">
                            {formatDate(event.date)}
                          </div>
                          <div className="text-gray-700">
                            {formatTime(event.date)}
                            {event.endDate && ` - ${formatTime(event.endDate)}`}
                          </div>
                          <div className="text-sm text-christmas-green font-medium">
                            {getRelativeTime(event.date)}
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-christmas-green flex-shrink-0" />
                          <span className="text-gray-700">
                            {event.location}
                          </span>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-6 pt-2 border-t">
                        <div className="flex items-center gap-2" title="Participants">
                          <Users className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">{event.participantCount}</span>
                        </div>
                        <div className="flex items-center gap-2" title="Contributions">
                          <ChefHat className="h-5 w-5 text-orange-600" />
                          <span className="font-medium">{event.contributionCount}</span>
                        </div>
                        <div className="flex items-center gap-2" title="Tâches">
                          <Gift className="h-5 w-5 text-christmas-red" />
                          <span className="font-medium">{event.taskCount}</span>
                        </div>
                      </div>

                      {/* CTA */}
                      <Button variant="secondary" className="w-full mt-4">
                        Voir les détails
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
