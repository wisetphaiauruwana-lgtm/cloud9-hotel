// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { LanguageProvider } from './context/LanguageContext';
import Router from './Router/Router';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <LanguageProvider>
      <Router />
    </LanguageProvider>
  </React.StrictMode>
);
