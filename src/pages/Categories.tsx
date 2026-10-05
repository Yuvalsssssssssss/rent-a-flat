import { useEffect, useState, type FormEvent } from 'react';
import { useData } from '../lib/data';
import type { Category } from '../lib/types';

export default function Categories() {
  const { categories, addCategory } = useData();
  const [newName, setNewName] = useState('');

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await addCategory(name);
    setNewName('');
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Categories & weights</h1>
        <p className="text-sm text-slate-500">Weight = how much it matters: 0 = ignore, 5 = crucial. Changes re-rank everything instantly.</p>
      </div>
      <ul className="card divide-y divide-slate-100 p-0">
        {categories.map((c, i) => (
          <CategoryRow key={c.id} category={c} isFirst={i === 0} isLast={i === categories.length - 1} />
        ))}
      </ul>
      <form onSubmit={onAdd} className="flex gap-2">
        <input className="input" placeholder="New category, e.g. Parking" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary shrink-0">Add</button>
      </form>
    </div>
  );
}

function CategoryRow({ category, isFirst, isLast }: { category: Category; isFirst: boolean; isLast: boolean }) {
  const { updateCategory, deleteCategory, moveCategory } = useData();
  const [name, setName] = useState(category.name);
  useEffect(() => setName(category.name), [category.name]);

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== category.name) updateCategory(category.id, { name: trimmed });
    else setName(category.name);
  }

  return (
    <li className="space-y-2 p-3">
      <div className="flex gap-1.5">
        <input className="input" value={name} aria-label="Category name"
          onChange={(e) => setName(e.target.value)} onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
        <button type="button" className="btn px-2.5" disabled={isFirst} aria-label="Move up" onClick={() => moveCategory(category.id, -1)}>↑</button>
        <button type="button" className="btn px-2.5" disabled={isLast} aria-label="Move down" onClick={() => moveCategory(category.id, 1)}>↓</button>
        <button type="button" className="btn-danger px-2.5" aria-label="Delete"
          onClick={() => { if (confirm(`Delete "${category.name}"? All scores in this category will be deleted.`)) deleteCategory(category.id); }}>✕</button>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 text-xs text-slate-500">Weight</span>
        <div className="grid flex-1 grid-cols-6 gap-1">
          {[0, 1, 2, 3, 4, 5].map((w) => (
            <button key={w} type="button" aria-pressed={category.weight === w}
              onClick={() => updateCategory(category.id, { weight: w })}
              className={`h-9 rounded-md text-sm font-semibold ${category.weight === w ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {w}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}
