"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, BarChart3, Database, HardDrive, Image as ImageIcon, RefreshCw, Activity } from 'lucide-react'

export default function MetricsPage() {
  const { user, accessToken, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [apiMetrics, setApiMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.push('/dashboard')
    }
  }, [authLoading, isAuthenticated, user, router])

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/metrics', {
        credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      if (response.ok) {
        const data = await response.json()
        setApiMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchMetrics()
    }
  }, [isAuthenticated, user, fetchMetrics])

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return
    
    const interval = setInterval(() => {
      fetchMetrics()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, isAuthenticated, fetchMetrics])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-red-900 to-green-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🎄</div>
          <div className="text-white text-xl font-semibold">Chargement des métriques...</div>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (!apiMetrics) return null

  const typeLabel: Record<string, string> = {
    CHAT: 'Chat',
    CONTRIBUTION: 'Contribution',
    POLL: 'Sondage',
    TASK: 'Tâche',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-red-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-christmas-green" />
                Métriques Système
              </h1>
              <p className="text-gray-600 mt-1">Statistiques en temps réel • Mis à jour: {new Date(apiMetrics.system.timestamp).toLocaleTimeString('fr-FR')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMetrics}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Entrées BDD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {apiMetrics.databaseStats.totalEntries.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {apiMetrics.databaseStats.totalEvents} événements • {apiMetrics.databaseStats.totalUsers} utilisateurs
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Taille Base de Données
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-700">
                {apiMetrics.system?.database?.size ?? '—'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {apiMetrics.system?.database?.name ? `Schema: ${apiMetrics.system.database.name}` : 'Schema inconnu'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Stockage Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {apiMetrics.system.uploadsSize}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {apiMetrics.system.totalImages} fichiers
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activité Récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                {apiMetrics.recentActivity?.length ?? 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Derniers changements (toutes sources)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Database Statistics */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Base de Données
              </CardTitle>
              <CardDescription>
                Statistiques détaillées par table
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Événements</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalEvents}</div>
                    <div className="text-xs text-gray-500">{apiMetrics.databaseStats.activeEvents} actifs</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Utilisateurs</span>
                  <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalUsers}</div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Contributions</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalContributions}</div>
                    <div className="text-xs text-gray-500">{apiMetrics.databaseStats.confirmedContributions} confirmées</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Sondages</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalPolls}</div>
                    <div className="text-xs text-gray-500">{apiMetrics.databaseStats.totalPollVotes} votes</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Options de sondage</span>
                  <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalPollOptions}</div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Tâches</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalTasks}</div>
                    <div className="text-xs text-gray-500">{apiMetrics.databaseStats.completedTasks} complétées</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Messages</span>
                  <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalMessages}</div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Médias chat</span>
                  <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalChatMessageMedia}</div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Menu</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalMenuRecipes}</div>
                    <div className="text-xs text-gray-500">{apiMetrics.databaseStats.totalIngredients} ingrédients</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Codes événement</span>
                  <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalEventCodes}</div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Codes ↔ événements</span>
                  <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalEventCodeEvents}</div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Participants événements</span>
                  <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalEventUsers}</div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Refresh tokens</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{apiMetrics.databaseStats.totalRefreshTokens}</div>
                    <div className="text-xs text-gray-500">
                      {apiMetrics.databaseStats.activeRefreshTokens} actifs • {apiMetrics.databaseStats.expiredRefreshTokens} expirés • {apiMetrics.databaseStats.revokedRefreshTokens} révoqués
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-100 rounded-lg border-2 border-blue-200">
                  <span className="text-sm font-bold text-blue-900">Total Entrées (toutes tables)</span>
                  <div className="text-xl font-bold text-blue-600">{apiMetrics.databaseStats.totalEntries.toLocaleString()}</div>
                </div>

                {Array.isArray(apiMetrics.system?.database?.topTables) && apiMetrics.system.database.topTables.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-500 mb-2">Plus grosses tables (taille)</div>
                    <div className="space-y-2">
                      {apiMetrics.system.database.topTables.slice(0, 5).map((t: any) => (
                        <div key={t.tableName} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700 truncate">{t.tableName}</span>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">{t.size}</div>
                            <div className="text-xs text-gray-500">{(t.rows ?? 0).toLocaleString()} lignes</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-purple-600" />
                Stockage Médias
              </CardTitle>
              <CardDescription>
                Images et fichiers uploadés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                  <div className="text-sm text-gray-600 mb-1">Espace total utilisé</div>
                  <div className="text-3xl font-bold text-purple-600">{apiMetrics.system.uploadsSize}</div>
                  <div className="text-xs text-gray-500 mt-1">{apiMetrics.system.totalImages} fichiers au total</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">Images de chat</span>
                    <span className="font-bold text-gray-900">{apiMetrics.system.imagesBreakdown.chatImages}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">Photos contributions</span>
                    <span className="font-bold text-gray-900">{apiMetrics.system.imagesBreakdown.contributionImages}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">Bannières sondages</span>
                    <span className="font-bold text-gray-900">{apiMetrics.system.imagesBreakdown.pollBanners}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <HardDrive className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-xs text-yellow-800">
                      <div className="font-medium">Dossier: public/uploads</div>
                      <div className="mt-1">Assurez-vous de sauvegarder régulièrement ce dossier</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        {apiMetrics.recentActivity && apiMetrics.recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Activité Récente
              </CardTitle>
              <CardDescription>
                Derniers changements (chat, contributions, sondages, tâches)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {apiMetrics.recentActivity.map((activity: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded bg-white border text-xs text-gray-700">
                          {typeLabel[activity.type] ?? activity.type}
                        </span>
                        {activity.user && (
                          <>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="font-medium text-sm text-gray-900">{activity.user}</span>
                          </>
                        )}
                        {activity.event && (
                          <>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">{activity.event}</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 truncate">{activity.title}</p>
                      {activity.preview && (
                        <p className="text-xs text-gray-600 truncate mt-0.5">{activity.preview}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(activity.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Endpoint Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Statistiques par Endpoint</CardTitle>
            <CardDescription>
              Performance détaillée des endpoints granulaires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Endpoint</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Taille Moyenne</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Temps Moyen</th>
                  </tr>
                </thead>
                <tbody>
                  {apiMetrics.endpointStats.map((stat: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{stat.endpoint}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{stat.description}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          {stat.avgSize}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                          {stat.avgTime}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Documentation Link */}
        <Card className="border-2 border-christmas-red">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-christmas-red to-christmas-green flex items-center justify-center text-2xl">
                📊
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Documentation Détaillée</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Consultez la documentation complète sur les optimisations API dans <code className="px-1 py-0.5 bg-gray-100 rounded">docs/OPTIMIZATION_METRICS.md</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
