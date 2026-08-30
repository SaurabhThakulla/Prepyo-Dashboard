import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './globals.css';
import App from './App';
import { AppProvider } from '@/context/AppContext';
import QueryProvider from '@/context/QueryProvider';
import { ToastProvider } from '@/components/ui/toast';

// The provider order that used to live in app/layout.tsx. It still matters:
// AppProvider fetches the session through the API, so QueryProvider has to be
// outside it, and ToastProvider has to be outside anything that reports errors.
const container = document.getElementById('root');
if (!container) throw new Error('index.html is missing #root');

createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <ToastProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </ToastProvider>
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
