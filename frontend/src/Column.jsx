import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Card from './Card.jsx';

export default function Column({ column, files }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const accent = column.id || 'uncategorized';

  return (
    <div
      ref={setNodeRef}
      className={`column accent-${accent}${isOver ? ' is-over' : ''}`}
    >
      <div className="column-header">
        <span className="column-title">{column.title}</span>
        <span className="column-count">{files.length}</span>
      </div>
      <div className="column-body">
        <SortableContext items={files.map(f => f.path)} strategy={verticalListSortingStrategy}>
          {files.map(f => <Card key={f.path} file={f} />)}
        </SortableContext>
        {files.length === 0 && <div className="column-empty">Drop files here</div>}
      </div>
    </div>
  );
}
