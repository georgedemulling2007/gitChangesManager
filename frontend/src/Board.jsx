import React from 'react';
import Column from './Column.jsx';

export default function Board({ columns, files }) {
  return (
    <div className="board">
      {columns.map(col => (
        <Column
          key={col.id || 'uncategorized'}
          column={col}
          files={files.filter(f => (f.category || '') === col.id)}
        />
      ))}
    </div>
  );
}
