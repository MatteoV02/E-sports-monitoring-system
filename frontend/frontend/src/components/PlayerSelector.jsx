/**
 * PlayerSelector.jsx
 * Componente para seleccionar un jugador del listado disponible
 * Props:
 * - players: Array de objetos de jugadores
 * - selectedPlayer: Objeto del jugador actualmente seleccionado
 * - onSelectPlayer: Función callback al seleccionar un jugador
 */

import React from 'react';
import { User } from 'lucide-react';
import '../styles/playerSelector.css';

const PlayerSelector = ({ players, selectedPlayer, onSelectPlayer }) => {
  const handleChange = (e) => {
    const playerId = parseInt(e.target.value);
    const player = players.find(p => p.id === playerId);
    onSelectPlayer(player || null);
  };

  return (
    <div className="player-selector-container">
      <label className="player-selector-label">
        <User size={18} className="label-icon" />
        Seleccionar Jugador
      </label>
      <select 
        className="player-selector-select"
        value={selectedPlayer?.id || ''}
        onChange={handleChange}
      >
        <option value="">-- Selecciona un jugador --</option>
        {players.map(player => (
          <option key={player.id} value={player.id}>
            {player.name} - {player.team} ({player.role})
          </option>
        ))}
      </select>
    </div>
  );
};

export default PlayerSelector;