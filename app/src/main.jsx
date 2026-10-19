// Точка входа: подключает общие стили и рисует приложение в <div id="root">.
import React from 'react';
import { createRoot } from 'react-dom/client';
// Сначала общие стили, чтобы стили отдельных экранов могли их уточнять.
import './styles.css';
import './styles/shared.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
