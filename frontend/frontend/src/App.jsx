/**
 * App.jsx
 * Componente raíz de la aplicación
 * Aquí se pueden agregar rutas con React Router en el futuro
 */

import React from 'react';
import Dashboard from './pages/Dashboard';
import './styles/global.css';

function App() {
  return (
    <div className="app">
      <Dashboard />
    </div>
  );
}

export default App;