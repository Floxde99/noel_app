"use client"

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-red-900 to-green-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="text-6xl mb-4">❄️</div>
          <CardTitle className="text-2xl">Quelque chose s&apos;est mal passé</CardTitle>
          <CardDescription className="text-lg">
            Une erreur inattendue s&apos;est produite
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {error.message || "Une erreur est survenue lors du chargement de la page."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={reset} size="lg">
              🔄 Réessayer
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => window.location.href = '/dashboard'}
            >
              🏠 Retour à l&apos;accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
