import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../lib/data';
import { EMPTY_FORM, toForm, toInput, type FormState } from '../lib/apartmentForm';
import Field from '../components/Field';

export default function ApartmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apartments, saveApartment } = useData();
  const existing = id ? apartments.find((a) => a.id === id) : undefined;
  const [form, setForm] = useState<FormState>(() => (existing ? toForm(existing) : EMPTY_FORM));
  const [saving, setSaving] = useState(false);

  if (id && !existing) return <p className="card">Apartment not found. <Link to="/" className="underline">Back</Link></p>;

  const bind = (k: keyof FormState) => ({
    value: form[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const savedId = await saveApartment(toInput(form), id);
    setSaving(false);
    if (savedId) navigate(`/apartment/${savedId}`, { replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">{id ? 'Edit apartment' : 'Add apartment'}</h1>
      <div className="card space-y-4">
        <Field label="Name *"><input className="input" required placeholder="e.g. Sunny 2BR near the park" {...bind('name')} /></Field>
        <Field label="Address"><input className="input" {...bind('address')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rent (€ / month)"><input className="input" type="number" inputMode="decimal" min="0" step="any" {...bind('rent_eur')} /></Field>
          <Field label="Size (m²)"><input className="input" type="number" inputMode="decimal" min="0" step="any" {...bind('size_m2')} /></Field>
          <Field label="Rooms"><input className="input" type="number" inputMode="decimal" min="0" step="0.5" {...bind('rooms')} /></Field>
          <Field label="Floor"><input className="input" {...bind('floor')} /></Field>
        </div>
        <Field label="Listing link"><input className="input" type="url" placeholder="https://…" {...bind('listing_url')} /></Field>
        <Field label="Visited on"><input className="input" type="date" {...bind('visited_on')} /></Field>
      </div>
      <div className="card space-y-4">
        <Field label="Video links (one per line)" hint="Google Drive or YouTube. In Drive: Share → General access → Anyone with the link.">
          <textarea className="input min-h-20" placeholder="https://drive.google.com/file/d/…" {...bind('video_urls')} />
        </Field>
        <Field label="Pros"><textarea className="input min-h-20" {...bind('pros')} /></Field>
        <Field label="Cons"><textarea className="input min-h-20" {...bind('cons')} /></Field>
        <Field label="Notes"><textarea className="input min-h-20" {...bind('notes')} /></Field>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </form>
  );
}
