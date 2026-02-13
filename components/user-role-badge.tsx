/**
 * User Role Badge Component
 * 
 * Displays the user's primary role with visual styling
 */
'use client'

import { useUser } from '@/contexts/user-context'
import { ROLE_DISPLAY_NAMES } from '@/lib/role-permissions'
import { Badge } from '@/components/ui/badge'
import { Shield, UserCog, User, Briefcase, Package } from 'lucide-react'

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'System Manager':
      return <Shield className="w-3 h-3" />
    case 'Sales Manager':
    case 'Accounts Manager':
    case 'Projects Manager':
    case 'Stock Manager':
      return <UserCog className="w-3 h-3" />
    case 'Sales User':
    case 'Accounts User':
    case 'Projects User':
      return <Briefcase className="w-3 h-3" />
    case 'Stock User':
      return <Package className="w-3 h-3" />
    default:
      return <User className="w-3 h-3" />
  }
}

const getRoleColor = (role: string): string => {
  switch (role) {
    case 'System Manager':
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
    case 'Sales Manager':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
    case 'Accounts Manager':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
    case 'Projects Manager':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
    case 'Stock Manager':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
    case 'Sales User':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20'
    case 'Accounts User':
      return 'bg-green-500/10 text-green-600 dark:text-green-300 border-green-500/20'
    case 'Projects User':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20'
    case 'Stock User':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20'
    default:
      return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20'
  }
}

interface UserRoleBadgeProps {
  variant?: 'default' | 'compact'
  showIcon?: boolean
}

export function UserRoleBadge({ variant = 'default', showIcon = true }: UserRoleBadgeProps) {
  const { primaryRole, loading } = useUser()

  if (loading) {
    return (
      <Badge variant="outline" className="bg-slate-500/10 border-slate-500/20 animate-pulse">
        <span className="text-xs">Loading...</span>
      </Badge>
    )
  }

  const displayName = ROLE_DISPLAY_NAMES[primaryRole] || primaryRole
  const icon = getRoleIcon(primaryRole)
  const colorClass = getRoleColor(primaryRole)

  if (variant === 'compact') {
    return (
      <Badge variant="outline" className={`${colorClass} text-xs font-medium`}>
        {showIcon && <span className="mr-1">{icon}</span>}
        {displayName}
      </Badge>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorClass}`}>
      {showIcon && icon}
      <span className="text-xs font-semibold uppercase tracking-wider">{displayName}</span>
    </div>
  )
}

/**
 * User Role List - Shows all roles
 */
export function UserRoleList() {
  const { roles, loading } = useUser()

  if (loading) {
    return <div className="text-xs text-slate-500 animate-pulse">Loading roles...</div>
  }

  if (roles.length === 0) {
    return <div className="text-xs text-slate-500">No roles assigned</div>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role) => {
        const displayName = ROLE_DISPLAY_NAMES[role] || role
        const colorClass = getRoleColor(role)
        
        return (
          <Badge
            key={role}
            variant="outline"
            className={`${colorClass} text-[10px] font-medium px-2 py-0.5`}
          >
            {displayName}
          </Badge>
        )
      })}
    </div>
  )
}
