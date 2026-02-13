
import React from 'react';
import { Button } from './ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                        <p className="text-gray-600 mb-6">
                            We're sorry, but an unexpected error occurred. Please try reloading the page.
                        </p>

                        {process.env.NODE_ENV === 'development' && (
                            <div className="text-left bg-gray-100 p-4 rounded text-xs font-mono mb-6 overflow-auto max-h-48">
                                <p className="text-red-600 font-bold">{this.state.error && this.state.error.toString()}</p>
                                <br />
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </div>
                        )}

                        <div className="flex gap-4 justify-center">
                            <Button onClick={() => window.location.href = '/'} variant="outline">
                                Go Home
                            </Button>
                            <Button onClick={this.handleReload} className="bg-primary text-white">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reload Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
