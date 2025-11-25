// src/App.jsx
import React, { useEffect } from 'react';
import Dashboard from "./pages/Dashboard";
import "./styles/global.css";

function App() {
  useEffect(() => {
    // Health check al iniciar
    fetch('http://localhost:8000/health')
      .then(res => res.json())
      .then(data => console.log('✅ Backend conectado:', data))
      .catch(err => console.error('❌ Error backend:', err));
  }, []);

  return (
    <div className="app">
      <Dashboard />
    </div>
  );
}

export default App;