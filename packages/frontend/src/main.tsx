import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/query/queryClient';
import App from './App';
import './styles/globals.css';
import './i18n/config';

// Register service worker with better error handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New version available. Reload to update.');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('SW registration failed:', error.message);
        // Non-critical: app works without SW
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-left"
          toastOptions={{
            duration: 3000,
            style: { direction: 'ltr' },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
