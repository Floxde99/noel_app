"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'

interface Assignee {
  id: string
  name: string
  avatar?: string
}

interface Ingredient {
  id: string
  name: string
  details?: string
  contributionId?: string | null
  contribution?: {
    id: string
    assignee?: Assignee | null
  } | null
}

interface Recipe {
  id: string
  title: string
  description?: string | null
  eventId: string
  ingredients: Ingredient[]
}

export default function AdminMenuRecipePage() {
  const params = useParams()
  const recipeId = useMemo(() => {
    const raw = (params as any)?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const router = useRouter()
  const { toast } = useToast()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const [newIngredient, setNewIngredient] = useState({ name: '', details: '' })

  const fetchRecipe = useCallback(async () => {
    if (!recipeId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/menu/${recipeId}`, { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de charger la recette')
      }
      const data = await res.json()
      setRecipe(data.recipe)
      setEditTitle(data.recipe?.title || '')
      setEditDescription(data.recipe?.description || '')
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [recipeId, toast])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) fetchRecipe()
  }, [isAuthenticated, fetchRecipe])

  const handleSaveRecipe = async () => {
    if (!recipeId) return
    if (!editTitle.trim()) {
      toast({ title: 'Titre requis', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch(`/api/menu/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() ? editDescription.trim() : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de modifier la recette')
      }
      toast({ title: 'Recette mise à jour', variant: 'success' })
      fetchRecipe()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur', variant: 'destructive' })
    }
  }

  const handleDeleteRecipe = async () => {
    if (!recipeId) return
    if (!confirm('Supprimer cette recette ?')) return

    try {
      const res = await fetch(`/api/menu/${recipeId}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de supprimer la recette')
      }
      toast({ title: 'Recette supprimée', variant: 'success' })
      router.push('/admin?tab=menu')
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur', variant: 'destructive' })
    }
  }

  const handleAddIngredient = async () => {
    if (!recipeId) return
    if (!newIngredient.name.trim()) {
      toast({ title: 'Nom requis', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch(`/api/menu/${recipeId}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newIngredient.name.trim(),
          details: newIngredient.details.trim() ? newIngredient.details.trim() : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible d\'ajouter l\'ingrédient')
      }
      setNewIngredient({ name: '', details: '' })
      fetchRecipe()
      toast({ title: 'Ingrédient ajouté', variant: 'success' })
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur', variant: 'destructive' })
    }
  }

  const handleDeleteIngredient = async (ingredientId: string) => {
    if (!confirm('Supprimer cet ingrédient ?')) return
    try {
      const res = await fetch(`/api/menu/ingredients/${ingredientId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de supprimer')
      }
      fetchRecipe()
      toast({ title: 'Ingrédient supprimé', variant: 'success' })
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur', variant: 'destructive' })
    }
  }

  const handleClaimIngredient = async (ingredientId: string) => {
    try {
      const res = await fetch(`/api/menu/ingredients/${ingredientId}/claim`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Impossible de prendre en charge')
      }
      toast({ title: 'Merci ! Assigné à vous', variant: 'success' })
      fetchRecipe()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur', variant: 'destructive' })
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
          <p className="text-xl text-white font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  if (isLoading || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
          <p className="text-xl text-white font-medium">Chargement recette...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b-2 border-christmas-red shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin?tab=menu">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-5 w-5" />
                Retour
              </Button>
            </Link>
            <h1 className="text-xl font-bold">🍽️ {recipe.title}</h1>
            <Button variant="outline" onClick={handleDeleteRecipe} className="gap-2" title="Supprimer la recette">
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Card className="border-2 border-christmas-red">
          <CardHeader>
            <CardTitle>Modifier la recette</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <Button onClick={handleSaveRecipe} className="w-full">Enregistrer</Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-christmas-red">
          <CardHeader>
            <CardTitle>Ingrédients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ingrédient</Label>
                <Input value={newIngredient.name} onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })} placeholder="Ex: Beurre" />
              </div>
              <div className="space-y-2">
                <Label>Détails (optionnel)</Label>
                <Input value={newIngredient.details} onChange={(e) => setNewIngredient({ ...newIngredient, details: e.target.value })} placeholder="Ex: 200g" />
              </div>
            </div>
            <Button onClick={handleAddIngredient} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>

            <div className="space-y-3">
              {recipe.ingredients.length === 0 ? (
                <p className="text-gray-700">Aucun ingrédient pour l’instant.</p>
              ) : (
                recipe.ingredients.map((ing) => {
                  const assignee = ing.contribution?.assignee
                  const isMine = assignee?.id && assignee.id === user?.id
                  return (
                    <div key={ing.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{ing.name}</div>
                        <div className="text-sm text-muted-foreground">{ing.details || ''}</div>
                        <div className="text-sm mt-2">
                          {assignee ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xl">{assignee.avatar || '👤'}</span>
                              <span className="text-gray-700">Pris par {assignee.name}{isMine ? ' (vous)' : ''}</span>
                            </span>
                          ) : (
                            <span className="text-gray-700">Non assigné</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {!assignee && (
                          <Button variant="outline" onClick={() => handleClaimIngredient(ing.id)}>
                            Je m’en occupe
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => handleDeleteIngredient(ing.id)} className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
