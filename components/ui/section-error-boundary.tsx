'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  title: string
  children: ReactNode
  onRetry?: () => void
}

type State = { hasError: boolean; message: string }

/**
 * Client error boundary for dashboard islands and other interactive sections.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Something went wrong',
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-foreground">{this.props.title}</p>
          <p className="mt-1 text-muted-foreground">{this.state.message}</p>
          {this.props.onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                this.setState({ hasError: false, message: '' })
                this.props.onRetry?.()
              }}
            >
              Retry
            </Button>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
