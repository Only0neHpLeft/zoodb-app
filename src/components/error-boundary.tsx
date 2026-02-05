import { Component, ErrorInfo, ReactNode, useState } from 'react'
import { Copy, Check } from 'lucide-react'

declare const __APP_VERSION__: string

function ErrorDetails({ error }: { error: Error }) {
  const [copied, setCopied] = useState(false)

  const errorText = [
    `Error: ${error.message}`,
    error.stack ? `\nStack trace:\n${error.stack}` : '',
    `\nApp version: ${__APP_VERSION__ ?? 'unknown'}`,
    `User agent: ${navigator.userAgent}`,
    `Timestamp: ${new Date().toISOString()}`,
  ].join('\n')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(errorText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <details className="mt-6 rounded-lg border bg-muted/50 p-4 text-left">
      <summary className="cursor-pointer text-sm font-medium">
        Error details
      </summary>
      <div className="relative mt-2">
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Copy error details"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
        <pre className="overflow-auto rounded-md bg-muted p-3 pr-10 text-xs text-muted-foreground max-h-64">
          {errorText}
        </pre>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Copy the error above when filing a{' '}
        <a
          href="https://github.com/Only0neHpLeft/zoodb-app/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          bug report
        </a>.
      </p>
    </details>
  )
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void errorInfo
    void error
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mb-2">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
            {this.state.error && <ErrorDetails error={this.state.error} />}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
