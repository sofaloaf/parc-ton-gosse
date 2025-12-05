import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { I18nProvider } from './shared/i18n.jsx';
import './utils/resetCardViews.js'; // Make resetCardViews available globally for testing

// Error boundary component
class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}

	componentDidCatch(error, errorInfo) {
		console.error('React Error Boundary caught an error:', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{ 
					padding: '40px', 
					textAlign: 'center',
					fontFamily: 'system-ui, sans-serif'
				}}>
					<h1 style={{ color: '#ef4444', marginBottom: '16px' }}>Something went wrong</h1>
					<p style={{ color: '#64748b', marginBottom: '24px' }}>
						{this.state.error?.message || 'An unexpected error occurred'}
					</p>
					<button 
						onClick={() => window.location.reload()}
						style={{
							padding: '12px 24px',
							background: '#3b82f6',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '16px'
						}}
					>
						Reload Page
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

// Wrap app with error boundary
const rootElement = document.getElementById('root');
if (!rootElement) {
	console.error('Root element not found!');
} else {
	try {
		const root = createRoot(rootElement);
		root.render(
			<React.StrictMode>
				<ErrorBoundary>
					<I18nProvider>
						<BrowserRouter>
							<App />
						</BrowserRouter>
					</I18nProvider>
				</ErrorBoundary>
			</React.StrictMode>
		);
	} catch (error) {
		console.error('Failed to render app:', error);
		rootElement.innerHTML = `
			<div style="padding: 40px; text-align: center; font-family: system-ui, sans-serif;">
				<h1 style="color: #ef4444;">Failed to load application</h1>
				<p style="color: #64748b;">${error.message}</p>
				<button onclick="window.location.reload()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
					Reload Page
				</button>
			</div>
		`;
	}
}
