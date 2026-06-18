import React, { useState, useRef } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { fetchStatus, saveBoard } from './api.js';
import { COLUMNS } from './columns.js';
import Board from './Board.jsx';
import { CardView } from './Card.jsx';

const COLUMN_IDS = new Set(COLUMNS.map(c => c.id));

export default function App() {
  const [repoInput, setRepoInput] = useState(localStorage.getItem('repoPath') || '');
  const [repo, setRepo] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const dragStartFiles = useRef([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    const path = repoInput.trim();
    if (!path) { setError('Enter a repository path.'); return; }
    localStorage.setItem('repoPath', path);
    setError('');
    setLoading(true);
    try {
      const data = await fetchStatus(path);
      setRepo(data.repo);
      setFiles(data.files);
      setLoaded(true);
    } catch (e) {
      setError(e.message);
      setFiles([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }

  const signature = list => list.map(f => f.path + ':' + (f.category || '')).join('|');

  function onDragStart({ active }) {
    setActiveId(active.id);
    dragStartFiles.current = files;
  }

  // Reorder the global files list so the dragged card sits exactly where the
  // cursor is — before/after the hovered card, opening a gap mid-list. Over an
  // empty column area, it goes to the end of that column.
  function onDragOver({ active, over }) {
    if (!over || active.id === over.id) return;
    setFiles(prev => {
      const fromIndex = prev.findIndex(f => f.path === active.id);
      if (fromIndex === -1) return prev;
      const moved = prev[fromIndex];

      // Determine the target category and insertion index.
      let targetCat;
      let insertBeforePath = null;
      if (COLUMN_IDS.has(over.id)) {
        targetCat = over.id; // dropped onto column whitespace -> end of column
      } else {
        const overCard = prev.find(f => f.path === over.id);
        if (!overCard) return prev;
        targetCat = overCard.category || '';
        insertBeforePath = over.id;
      }

      const without = prev.filter(f => f.path !== active.id);
      const updated = { ...moved, category: targetCat };

      if (insertBeforePath == null) {
        // Append after the last card already in the target column.
        let lastIdx = -1;
        without.forEach((f, i) => { if ((f.category || '') === targetCat) lastIdx = i; });
        without.splice(lastIdx + 1, 0, updated);
      } else {
        const idx = without.findIndex(f => f.path === insertBeforePath);
        without.splice(idx, 0, updated);
      }
      return without;
    });
  }

  function onDragEnd() {
    setActiveId(null);
    setFiles(current => {
      // Persist only if category or order actually changed.
      if (signature(current) !== signature(dragStartFiles.current)) {
        const snapshot = current;
        saveBoard(repo, snapshot).catch(e => {
          setFiles(dragStartFiles.current); // revert on failure
          setError(e.message);
        });
      }
      return current;
    });
  }

  function onDragCancel() {
    setFiles(dragStartFiles.current);
    setActiveId(null);
  }

  const activeFile = activeId ? files.find(f => f.path === activeId) : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Git Changes Manager</h1>
        <div className="repo-bar">
          <input
            type="text"
            value={repoInput}
            placeholder="C:\path\to\repo   or   /Users/you/repo"
            onChange={e => setRepoInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') load(); }}
          />
          <button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Load'}</button>
        </div>
        {error && <div className="error">{error}</div>}
        {loaded && !error && (
          <div className="meta">{files.length} changed file(s) in <code>{repo}</code></div>
        )}
      </header>

      {loaded && files.length === 0 && !error && (
        <div className="empty-all">No changed files — working tree is clean.</div>
      )}

      {loaded && files.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <Board columns={COLUMNS} files={files} />
          <DragOverlay>
            {activeFile ? <CardView file={activeFile} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
