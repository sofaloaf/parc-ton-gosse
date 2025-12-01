import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { I18nProvider } from './shared/i18n.jsx';
import './utils/resetCardViews.js'; // Make resetCardViews available globally for testing

createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<I18nProvider>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</I18nProvider>
	</React.StrictMode>
);
