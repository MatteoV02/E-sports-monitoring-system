// src/App.jsx
import React from "react";
import { useEffect } from 'react';
import Dashboard from "./pages/Dashboard";
import "./styles/global.css"; // Si tienes estilos globales

function App() {
  return (
    <div className="app">
      <Dashboard />
    </div>
  );



useEffect(() => {
  fetch('/api/health')
    .then(res => res.json())
    .then(data => console.log('Backend conectado:', data))
    .catch(err => console.error('Error backend:', err));
}, []);

}


export default App;
