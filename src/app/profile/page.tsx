"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, User, Mail, Save, Loader2 } from 'lucide-react'

const AVATAR_OPTIONS = ['👤', '👨', '👩', '👴', '👵', '👦', '👧', '🧑', '🎅', '🤶', '🧝', '⛄']

export default function ProfilePage() {
  const { user, isLoading: authLoading, isAuthenticated, refreshAuth } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('👤')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setAvatar(user.avatar || '👤')
    }
  }, [user])

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nom requis',
        description: 'Veuillez entrer votre nom',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          avatar,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Profil mis à jour ! ✨',
          description: 'Vos modifications ont été enregistrées',
          variant: 'success',
        })
        await refreshAuth()
      } else {
        const data = await response.json()
        toast({
          title: 'Erreur',
          description: data.error || 'Impossible de sauvegarder',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le profil',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-christmas-red" />
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
            <h1 className="text-xl font-bold">Mon Profil</h1>
            <div className="w-20" /> {/* Spacer */}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">{avatar}</div>
            <CardTitle className="text-2xl">{user?.name}</CardTitle>
            <CardDescription>
              {user?.role === 'ADMIN' ? '👑 Administrateur' : '👤 Membre'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar selection */}
            <div className="space-y-3">
              <Label className="text-lg">Choisir un avatar</Label>
              <div className="flex flex-wrap gap-2 justify-center">
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAvatar(opt)}
                    className={`text-3xl p-2 rounded-lg transition-all ${
                      avatar === opt
                        ? 'bg-christmas-red/20 scale-110 ring-2 ring-christmas-red'
                        : 'hover:bg-muted'
                    }`}
                    aria-label={`Sélectionner avatar ${opt}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Nom
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre prénom ou nom"
                className="text-lg"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email (optionnel)
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Pour récupérer votre compte si besoin
              </p>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="lg"
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
