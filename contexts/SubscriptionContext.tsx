'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { PLAN_FEATURES, type PlanFeatures, type SubscriptionPlan } from '@/types/tenant'

interface SubscriptionContextType {
  plan: SubscriptionPlan
  features: PlanFeatures
  isLoading: boolean
  hasPermission: (module: string) => boolean
  canUse: (feature: keyof PlanFeatures['features']) => boolean
  checkLimit: (feature: 'users' | 'leads' | 'projects' | 'invoices', currentCount: number) => boolean
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

interface SubscriptionProviderProps {
  children: React.ReactNode
  initialPlan?: SubscriptionPlan
}

export function SubscriptionProvider({ children, initialPlan = 'free' }: SubscriptionProviderProps) {
  const [plan, setPlan] = useState<SubscriptionPlan>(initialPlan)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch current tenant's subscription plan from API
    async function fetchPlan() {
      try {
        const response = await fetch('/api/subscription/current')
        if (response.ok) {
          const data = await response.json()
          setPlan(data.plan || 'free')
        }
      } catch (error) {
        console.error('Failed to fetch subscription plan:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlan()
  }, [])

  const features = PLAN_FEATURES[plan]

  /**
   * Check if the current plan has access to a specific ERPNext module
   */
  const hasPermission = (module: string): boolean => {
    return features.modules.includes(module)
  }

  /**
   * Check if the current plan can use a specific feature
   */
  const canUse = (feature: keyof PlanFeatures['features']): boolean => {
    const featureValue = features.features[feature]
    
    // If feature is boolean, return it directly
    if (typeof featureValue === 'boolean') {
      return featureValue
    }
    
    // If feature is 'unlimited', return true
    if (featureValue === 'unlimited') {
      return true
    }
    
    // If feature is an array, check if it has items
    if (Array.isArray(featureValue)) {
      return featureValue.length > 0
    }
    
    // If feature is a number, return true (limit exists)
    if (typeof featureValue === 'number') {
      return featureValue > 0
    }
    
    return false
  }

  /**
   * Check if current usage is within plan limits
   */
  const checkLimit = (
    feature: 'users' | 'leads' | 'projects' | 'invoices',
    currentCount: number
  ): boolean => {
    const limit = features.features[feature]
    
    if (limit === 'unlimited') {
      return true
    }
    
    if (typeof limit === 'number') {
      return currentCount < limit
    }
    
    return false
  }

  return (
    <SubscriptionContext.Provider
      value={{
        plan,
        features,
        isLoading,
        hasPermission,
        canUse,
        checkLimit
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

/**
 * Hook to access subscription context
 */
export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return context
}

/**
 * HOC to protect components based on plan features
 */
export function withSubscription<P extends object>(
  Component: React.ComponentType<P>,
  requiredFeature: keyof PlanFeatures['features']
) {
  return function SubscriptionGuard(props: P) {
    const { canUse, isLoading } = useSubscription()

    if (isLoading) {
      return <div>Loading...</div>
    }

    if (!canUse(requiredFeature)) {
      return (
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Upgrade Required</h3>
          <p className="text-muted-foreground">
            This feature is not available on your current plan.
          </p>
          <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Upgrade Plan
          </button>
        </div>
      )
    }

    return <Component {...props} />
  }
}

/**
 * Component to show feature gate message
 */
export function FeatureGate({
  feature,
  children,
  fallback
}: {
  feature: keyof PlanFeatures['features']
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { canUse, isLoading } = useSubscription()

  if (isLoading) {
    return null
  }

  if (!canUse(feature)) {
    return fallback || (
      <div className="text-sm text-muted-foreground">
        Upgrade your plan to use this feature
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Component to check usage limits
 */
export function UsageGuard({
  feature,
  currentCount,
  children,
  onLimitReached
}: {
  feature: 'users' | 'leads' | 'projects' | 'invoices'
  currentCount: number
  children: React.ReactNode
  onLimitReached?: () => void
}) {
  const { checkLimit, features } = useSubscription()
  const withinLimit = checkLimit(feature, currentCount)

  if (!withinLimit) {
    if (onLimitReached) {
      onLimitReached()
    }

    const limit = features.features[feature]
    return (
      <div className="p-4 border border-yellow-500 bg-yellow-50 rounded-md">
        <p className="text-sm text-yellow-800">
          You've reached your plan limit of {limit} {feature}. Upgrade to continue.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
