import { Component, type ErrorInfo, type ReactNode } from 'react'

import { reportError } from '../../../../lib/errorReporter'
import { GlobalError } from '../GlobalError/GlobalError'

// Defense-in-depth boundary for non-route descendants (Header, Toaster, BottomNav);
// TanStack root errorComponent handles loader/route throws but not these.
interface Props {
  children: ReactNode
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode
}

interface State {
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { source: 'AppErrorBoundary', componentStack: info.componentStack })
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback({ error, reset: this.reset })
    return <GlobalError error={error} reset={this.reset} />
  }
}
