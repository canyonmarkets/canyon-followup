'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, List, Phone, Trash2, CalendarPlus } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES = ['Phoenix', 'Tempe', 'Ahwatukee', 'Gilbert', 'Mesa', 'Chandler'] as const;

const BEDROOM_OPTIONS = [
  { value: '1', label: '1 Bedroom' },
  { value: '2', label: '2 Bedrooms' },
  { value: '3', label: '3 Bedrooms' },
] as const;

type BedroomVal = '1' | '2' | '3';
type Filter = BedroomVal | 'all';
const STORAGE_KEY = 'canyon-apts-leads-v1';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  phone: string;
  bedrooms: BedroomVal;
  city: string;
  callBackDate: string;
  notes: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLeads(): Lead[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persist(leads: Lead[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

function calendarUrl(lead: Lead): string {
  const d = lead.callBackDate.replace(/-/g, '');
  const next = new Date(lead.callBackDate + 'T12:00:00');
  next.setDate(next.getDate() + 1);
  const d2 = next.toISOString().slice(0, 10).replace(/-/g, '');
  const text = encodeURIComponent(`Call ${lead.name} — Canyon Apts`);
  const details = encodeURIComponent(
    [`📞 ${lead.phone}`, `${lead.bedrooms}BR · ${lead.city}`, lead.notes]
      .filter(Boolean)
      .join('\n'),
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${d}/${d2}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-iron-200 bg-white px-4 py-3 text-base text-iron-900 ' +
  'placeholder:text-iron-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ' +
  'focus:border-transparent transition-all duration-150';
const labelCls = 'block text-sm font-medium text-iron-700 mb-1.5';

const Chevron = () => (
  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-iron-400">
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<'add' | 'list'>('add');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bedrooms, setBedrooms] = useState<BedroomVal>('1');
  const [city, setCity] = useState<string>(CITIES[0]);
  const [callBackDate, setCallBackDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => { setLeads(loadLeads()); }, []);

  const resetForm = () => {
    setName(''); setPhone(''); setBedrooms('1');
    setCity(CITIES[0]); setCallBackDate(''); setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');

    const lead: Lead = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      bedrooms,
      city,
      callBackDate,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [lead, ...leads];
    setLeads(updated);
    persist(updated);
    resetForm();
    setSaveStatus('saved');

    setTimeout(() => { setSaveStatus('idle'); setTab('list'); }, 1400);

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    }).catch(() => {});
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remove this person from your list?')) return;
    const updated = leads.filter(l => l.id !== id);
    setLeads(updated);
    persist(updated);
  };

  const visible = filter === 'all' ? leads : leads.filter(l => l.bedrooms === filter);

  return (
    <div className="flex flex-col bg-iron-100 font-sans" style={{ height: '100dvh' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-iron-900 px-5" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="h-16 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/canyon-logo.png" alt="Canyon Apartments" className="h-10 w-auto" />
          <div className="leading-none">
            <p className="font-display text-lg font-bold uppercase tracking-widest text-white">
              Canyon Apts
            </p>
            <p className="text-[11px] text-iron-400 mt-0.5 tracking-wide">Follow-Up List</p>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">

        {/* ─── ADD FORM ────────────────────────────────────────────────────── */}
        {tab === 'add' && (
          <div className="px-4 pt-5 pb-8">

            {saveStatus === 'saved' && (
              <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2 text-green-700 text-sm font-medium">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved! Opening your list…
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-iron-100 p-5 space-y-4">

              <div>
                <label className={labelCls}>Name</label>
                <input
                  type="text"
                  required
                  placeholder="First and last name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="(602) 555-1234"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Bedrooms</label>
                  <div className="relative">
                    <select
                      value={bedrooms}
                      onChange={e => setBedrooms(e.target.value as BedroomVal)}
                      className={`${inputCls} appearance-none pr-8`}
                    >
                      {BEDROOM_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <Chevron />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>City</label>
                  <div className="relative">
                    <select
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className={`${inputCls} appearance-none pr-8`}
                    >
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <Chevron />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Call Back Date{' '}
                  <span className="text-iron-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={callBackDate}
                  onChange={e => setCallBackDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Notes{' '}
                  <span className="text-iron-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="What did you talk about? Any special requests?"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={saveStatus !== 'idle'}
                className="w-full rounded-xl bg-brand-600 py-4 text-base font-semibold text-white hover:bg-brand-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-60"
              >
                {saveStatus === 'saving' ? 'Saving…' : 'Save to My List'}
              </button>

            </form>
          </div>
        )}

        {/* ─── LIST VIEW ───────────────────────────────────────────────────── */}
        {tab === 'list' && (
          <div className="pb-8">

            <div className="flex gap-2 px-4 pt-4 pb-3 overflow-x-auto">
              {(['all', '1', '2', '3'] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={[
                    'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150',
                    filter === f
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-white text-iron-500 border border-iron-200',
                  ].join(' ')}
                >
                  {f === 'all' ? `All (${leads.length})` : `${f}BR`}
                </button>
              ))}
            </div>

            {visible.length === 0 && (
              <div className="mt-16 flex flex-col items-center gap-3 text-center px-8">
                <List size={40} className="text-iron-300" />
                <p className="font-medium text-iron-500">
                  {leads.length === 0 ? 'No follow-ups yet.' : `No ${filter}BR follow-ups.`}
                </p>
                {leads.length === 0 && (
                  <p className="text-sm text-iron-400">
                    Tap{' '}
                    <button
                      onClick={() => setTab('add')}
                      className="text-brand-500 font-medium underline underline-offset-2"
                    >
                      Add Person
                    </button>{' '}
                    to get started.
                  </p>
                )}
              </div>
            )}

            {visible.length > 0 && (
              <div className="px-4 space-y-3">
                {visible.map(lead => (
                  <div key={lead.id} className="bg-white rounded-2xl border border-iron-100 shadow-sm p-4">

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-iron-900 leading-tight">{lead.name}</p>
                        <span className="mt-1.5 inline-block rounded-full bg-brand-50 border border-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                          {lead.bedrooms}BR · {lead.city}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="p-1.5 rounded-lg text-iron-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 shrink-0"
                        aria-label={`Delete ${lead.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <a
                      href={`tel:${lead.phone.replace(/\D/g, '')}`}
                      className="mt-3 flex items-center gap-2 text-brand-600 font-medium text-sm"
                    >
                      <Phone size={14} />
                      {lead.phone}
                    </a>

                    {lead.notes && (
                      <p className="mt-2 text-sm text-iron-500 leading-relaxed">{lead.notes}</p>
                    )}

                    {lead.callBackDate && (
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-iron-500">
                          Call back:{' '}
                          <span className="font-medium text-iron-700">{formatDate(lead.callBackDate)}</span>
                        </p>
                        <a
                          href={calendarUrl(lead)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-100 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 transition-colors duration-150"
                        >
                          <CalendarPlus size={12} />
                          Add to Calendar
                        </a>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Bottom navigation ───────────────────────────────────────────────── */}
      <nav
        className="shrink-0 bg-white border-t border-iron-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="h-16 flex">
          <button
            onClick={() => setTab('add')}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150',
              tab === 'add' ? 'text-brand-500' : 'text-iron-400',
            ].join(' ')}
          >
            <PlusCircle size={22} strokeWidth={tab === 'add' ? 2.5 : 1.75} />
            Add Person
          </button>
          <button
            onClick={() => setTab('list')}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150',
              tab === 'list' ? 'text-brand-500' : 'text-iron-400',
            ].join(' ')}
          >
            <List size={22} strokeWidth={tab === 'list' ? 2.5 : 1.75} />
            {leads.length > 0 ? `My List (${leads.length})` : 'My List'}
          </button>
        </div>
      </nav>

    </div>
  );
}
