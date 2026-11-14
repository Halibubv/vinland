// Точка входа: подключает общие стили и рисует приложение в <div id="root">.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Сначала общие стили, чтобы стили отдельных экранов могли их уточнять.
import './styles.css';
import './styles/shared.css';
import './styles/motion.css';
import App from './App.jsx';

// BrowserRouter следит за адресом в строке браузера, без него не работают Routes и Link.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
