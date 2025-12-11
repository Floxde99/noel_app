"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-red-900 to-green-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="text-6xl mb-4">🎄</div>
          <CardTitle className="text-4xl">404</CardTitle>
          <CardDescription className="text-lg">
            Oups ! Cette page s&apos;est perdue dans la neige...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild size="lg">
              <Link href="/dashboard">
                🏠 Retour à l&apos;accueil
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">
                🔑 Se connecter
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
