import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function badgeClass(label) {
  return 'badge badge-' + String(label || 'changed').toLowerCase();
}

// Presentational card — also used by the DragOverlay floating copy.
export function CardView({ file, overlay }) {
  return (
    <div className={`card${overlay ? ' overlay' : ''}`}>
      <span className={badgeClass(file.label)}>{file.label}</span>
      <span className="card-file" title={file.path}>{file.displayName || file.path}</span>
    </div>
  );
}

// Sortable card. Siblings animate aside to reveal the insertion gap; the source
// card dims while its floating copy is shown in the DragOverlay.
export default function Card({ file }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: file.path });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="card-handle">
      <CardView file={file} />
    </div>
  );
}
