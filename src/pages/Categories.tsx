import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useData } from '../lib/data';
import PageHeader from '../components/PageHeader';
import type { Category } from '../lib/types';

export default function Categories() {
  const { categories, addCategory } = useData();
  const [newName, setNewName] = useState('');
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await addCategory(name);
    setNewName('');
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title="Weights" subtitle="How much each category matters: 0 = ignore, 5 = crucial. Re-ranks instantly." />
      <ul className="space-y-2">
        {categories.map((c, i) => (
          <CategoryRow key={c.id} category={c} totalWeight={totalWeight} isFirst={i === 0} isLast={i === categories.length - 1} />
        ))}
      </ul>
      <form onSubmit={onAdd} className="flex gap-2">
        <input className="input min-w-0" placeholder="New category, e.g. Parking" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary shrink-0"><Plus size={16} />Add</button>
      </form>
    </div>
  );
}

function CategoryRow({ category, isFirst, isLast, totalWeight }: { category: Category; isFirst: boolean; isLast: boolean; totalWeight: number }) {
  const share = totalWeight ? Math.round((category.weight / totalWeight) * 100) : 0;
  const { updateCategory, deleteCategory, moveCategory } = useData();
  const [name, setName] = useState(category.name);
  useEffect(() => setName(category.name), [category.name]);

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== category.name) updateCategory(category.id, { name: trimmed });
    else setName(category.name);
  }

  return (
    <li className="card space-y-3 p-3">
      <div className="flex items-center gap-1">
        <input className="input min-w-0 border-transparent bg-transparent px-2 font-medium hover:border-line" value={name} aria-label="Category name"
          onChange={(e) => setName(e.target.value)} onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
        <span className="w-10 shrink-0 text-right text-xs text-zinc-500 tabular-nums">{share}%</span>
        <button type="button" className="btn-icon" disabled={isFirst} aria-label="Move up" onClick={() => moveCategory(category.id, -1)}><ArrowUp size={16} /></button>
        <button type="button" className="btn-icon" disabled={isLast} aria-label="Move down" onClick={() => moveCategory(category.id, 1)}><ArrowDown size={16} /></button>
        <button type="button" className="btn-icon hover:text-rose-400" aria-label="Delete"
          onClick={() => { if (confirm(`Delete "${category.name}"? All scores in this category will be deleted.`)) deleteCategory(category.id); }}><Trash2 size={16} /></button>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {[0, 1, 2, 3, 4, 5].map((w) => (
          <button key={w} type="button" aria-pressed={category.weight === w}
            onClick={() => updateCategory(category.id, { weight: w })}
            className={`h-9 rounded-lg text-sm font-semibold transition active:scale-95 ${category.weight === w ? 'bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-950/50' : 'bg-surface-2 text-zinc-500 hover:text-zinc-200'}`}>
            {w}
          </button>
        ))}
      </div>
    </li>
  );
}
