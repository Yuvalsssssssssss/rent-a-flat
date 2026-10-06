import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../lib/data';
import { EMPTY_FORM, toForm, toInput, type FormState } from '../lib/apartmentForm';
import Field from '../components/Field';
import { geocodeAddress } from '../lib/geocode';

export default function ApartmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apartments, saveApartment } = useData();
  const existing = id ? apartments.find((a) => a.id === id) : undefined;
  const [form, setForm] = useState<FormState>(() => (existing ? toForm(existing) : EMPTY_FORM));
  const [saving, setSaving] = useState(false);

  if (id && !existing) return <p className="card">Apartment not found. <Link to="/" className="text-violet-300 underline">Back</Link></p>;

  const bind = (k: keyof FormState) => ({
    value: form[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const input = toInput(form);
    let coords: { lat?: number; lng?: number } = {};
    // Look up the pin only when the address is new or changed, so a manually dragged pin is kept.
    if (input.address && (!existing || existing.lat === null || input.address !== existing.address)) {
      try {
        const found = await geocodeAddress(input.address);
        if (found) coords = { lat: found.lat, lng: found.lng };
      } catch {
        // Map lookup is best-effort; the pin can be placed by hand on the apartment page.
      }
    }
    const savedId = await saveApartment({ ...input, ...coords }, id);
    setSaving(false);
    if (savedId) navigate(`/apartment/${savedId}`, { replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"><ArrowLeft size={16} />Back</button>
      <h1 className="text-2xl font-semibold tracking-tight">{id ? 'Edit apartment' : 'New apartment'}</h1>
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
        <Field label="Pros"><textarea className="input min-h-20" placeholder="Great view, quiet street…" {...bind('pros')} /></Field>
        <Field label="Cons"><textarea className="input min-h-20" placeholder="No balcony, pricey…" {...bind('cons')} /></Field>
        <Field label="Notes"><textarea className="input min-h-20" {...bind('notes')} /></Field>
      </div>
      <div className="sticky bottom-24 z-20 flex gap-2 rounded-2xl border border-line bg-surface/90 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl sm:bottom-4">
        <button type="button" className="btn flex-1" onClick={() => navigate(-1)}>Cancel</button>
        <button className="btn-primary flex-[2]" disabled={saving}>{saving ? 'Saving…' : 'Save apartment'}</button>
      </div>
    </form>
  );
}
