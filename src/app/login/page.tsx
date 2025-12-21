"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { TreePine, Gift, Snowflake, Star } from 'lucide-react'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [eventCode, setEventCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Pré-remplit le code d'événement depuis l'URL ?code=XXXX
  useEffect(() => {
    const code = searchParams?.get('code')
    if (code) {
      setEventCode(code.toUpperCase())
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !eventCode.trim()) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir votre nom et le code d\'événement',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await login(name.trim(), eventCode.trim().toUpperCase())
      
      if (result.success) {
        toast({
          title: 'Bienvenue ! 🎄',
          description: `Connexion réussie, ${name}`,
          variant: 'christmas',
        })
        router.push('/dashboard')
      } else {
        toast({
          title: 'Erreur de connexion',
          description: result.error || 'Vérifiez votre nom et code d\'événement',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de se connecter. Réessayez plus tard.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-transparent">
      {/* Decorative elements */}
      <div className="absolute top-4 left-4 text-christmas-gold animate-twinkle">
        <Star className="h-8 w-8" />
      </div>
      <div className="absolute top-4 right-4 text-christmas-green">
        <TreePine className="h-10 w-10" />
      </div>
      <div className="absolute bottom-4 left-4 text-christmas-red">
        <Gift className="h-8 w-8" />
      </div>
      <div className="absolute bottom-4 right-4 text-blue-300 animate-pulse">
        <Snowflake className="h-8 w-8" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-3">
            <TreePine className="h-12 w-12 text-white" />
            <h1 className="text-4xl font-bold text-white drop-shadow-md">
              Noël en Famille
            </h1>
            <TreePine className="h-12 w-12 text-white" />
          </div>
          <p className="text-xl text-white/90 font-medium">
            Organisez vos fêtes de fin d’année 🎄
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-2 border-christmas-red/20 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Connexion</CardTitle>
            <CardDescription className="text-lg">
              Entrez votre nom et le code de l’événement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-lg">
                  Votre prénom ou nom
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: Marie, Papy Jean..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg h-14"
                  autoComplete="name"
                  aria-describedby="name-help"
                />
                <p id="name-help" className="text-sm text-gray-700">
                  Le prénom que la famille vous connaît
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="eventCode" className="text-lg">
                  Code de l’événement
                </Label>
                <Input
                  id="eventCode"
                  type="text"
                  placeholder="Ex: NOEL-2025-SOIR"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  className="text-lg h-14 font-mono uppercase"
                  autoComplete="off"
                  aria-describedby="code-help"
                />
                <p id="code-help" className="text-sm text-gray-700">
                  Code reçu de l'organisateur
                </p>
              </div>

              <Button
                type="submit"
                size="xl"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Snowflake className="mr-2 h-5 w-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Gift className="mr-2 h-5 w-5" />
                    Rejoindre l’événement
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help text */}
            <div className="text-center space-y-2 text-white/90">
              <p className="text-lg">
                Pas de code ? Demandez-le à l’organisateur de la fête ! 🎁
              </p>
            </div>
      </div>
    </div>
  )
}
