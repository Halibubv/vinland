import React from 'react';
import { createRoot } from 'react-dom/client';
// Global styles first, so screen styles imported by the pages can refine them.
import './styles.css';
import './styles/shared.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
