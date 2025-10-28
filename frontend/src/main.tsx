import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // optional
import './api/testInterceptor'; // Load axios interceptor test

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
