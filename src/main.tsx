import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { bootstrapThemePreference } from './app/themePreference';
import './styles/index.css';

bootstrapThemePreference();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
