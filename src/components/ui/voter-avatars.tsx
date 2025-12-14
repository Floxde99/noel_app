import React from 'react'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string | null
  avatar?: string | null
}

interface VoterAvatarsProps {
  voters: User[]
  maxDisplay?: number
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Displays voter avatars in a row with initials
 * Shows first N avatars and +X count if more exist
 */
export function VoterAvatars({
  voters,
  maxDisplay = 5,
  size = 'sm',
}: VoterAvatarsProps) {
  if (!voters || voters.length === 0) {
    return null
  }

  const displayedVoters = voters.slice(0, maxDisplay)
  const remainingCount = Math.max(0, voters.length - maxDisplay)

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getColorForId = (id: string) => {
    const colors = [
      'bg-red-300',
      'bg-orange-300',
      'bg-yellow-300',
      'bg-green-300',
      'bg-blue-300',
      'bg-indigo-300',
      'bg-purple-300',
      'bg-pink-300',
    ]
    const index = id.charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {displayedVoters.map((voter) => (
          <div
            key={voter.id}
            className={cn(
              'rounded-full border-2 border-white flex items-center justify-center font-semibold text-gray-700 cursor-help',
              sizeClasses[size],
              getColorForId(voter.id)
            )}
            title={voter.name || 'Utilisateur'}
          >
            {getInitials(voter.name)}
          </div>
        ))}
      </div>
      {remainingCount > 0 && (
        <span className={cn('text-gray-600 font-medium', size === 'sm' ? 'text-xs' : 'text-sm')}>
          +{remainingCount}
        </span>
      )}
    </div>
  )
}
