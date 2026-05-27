'use client';

import { useState, useEffect, useRef } from 'react';
import { PlusCircle, List, Phone, Trash2, CalendarPlus, Pencil, X, Check, Calendar } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES = ['Phoenix', 'Tempe', 'Ahwatukee', 'Gilbert', 'Mesa', 'Chandler'] as const;

const BEDROOM_OPTIONS = [
  { value: '1', label: '1 BR' },
  { value: '2', label: '2 BR' },
  { value: '3', label: '3 BR' },
] as const;

const QUICK_WEEKS = [1, 2, 3, 4] as const;

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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is Lead =>
        x && typeof x === 'object' &&
        typeof x.id === 'string' &&
        typeof x.name === 'string' &&
        typeof x.phone === 'string',
    );
  } catch {
    return [];
  }
}

function persist(leads: Lead[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // Storage unavailable or full — data lives in memory for this session
  }
}

function weeksFromNow(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function calendarUrl(lead: Lead): string {
  const d = lead.callBackDate.replace(/-/g, '');
  const next = new Date(lead.callBackDate + 'T12:00:00');
  next.setDate(next.getDate() + 1);
  const d2 = next.toISOString().slice(0, 10).replace(/-/g, '');
  const text = encodeURIComponent(`Call ${lead.name} — Canyon Apts`);
  const details = encodeURIComponent(
    [`📞 ${lead.phone}`, `${lead.bedrooms}BR · ${lead.city}`, lead.notes]
      .filter(Boolean).join('\n'),
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${d}/${d2}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

function timeAgo(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (days === 0) return 'Added today';
  if (days === 1) return 'Added yesterday';
  return `Added ${days} days ago`;
}

function isOverdue(callBackDate: string): boolean {
  if (!callBackDate) return false;
  return new Date(callBackDate + 'T23:59:59') < new Date();
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-iron-200 bg-white px-4 py-2 text-base font-medium text-iron-900 ' +
  'placeholder:text-iron-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-500 ' +
  'focus:border-transparent transition-all duration-150';
const labelCls = 'block text-sm font-semibold text-iron-800 mb-1';

const Chevron = () => (
  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-iron-400">
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

// Date input with calendar icon overlay
const DateInput = ({
  value, onChange, className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) => (
  <div className="relative">
    <input
      type="date"
      value={value}
      onChange={onChange}
      className={`${className ?? inputCls} pr-10`}
    />
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-iron-400">
      <Calendar size={16} />
    </div>
  </div>
);

// Quick callback week buttons
function QuickWeekButtons({
  activeWeeks, onSelect,
}: {
  activeWeeks: number | null;
  onSelect: (weeks: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-2">
      {QUICK_WEEKS.map(w => (
        <button
          key={w}
          type="button"
          onClick={() => onSelect(w)}
          className={[
            'rounded-xl py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97]',
            activeWeeks === w
              ? 'bg-brand-800 text-white shadow-sm'
              : 'bg-brand-500 text-white hover:bg-brand-600',
          ].join(' ')}
        >
          {w === 1 ? '1 Week' : `${w} Wks`}
        </button>
      ))}
    </div>
  );
}

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
  const [quickWeeks, setQuickWeeks] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [nameError, setNameError] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Lead | null>(null);
  const [editQuickWeeks, setEditQuickWeeks] = useState<number | null>(null);

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSwitchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLeads(loadLeads()); }, []);

  useEffect(() => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    if (pendingDelete) {
      deleteTimerRef.current = setTimeout(() => setPendingDelete(null), 3000);
    }
    return () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); };
  }, [pendingDelete]);

  const switchTab = (t: 'add' | 'list') => {
    if (autoSwitchRef.current) clearTimeout(autoSwitchRef.current);
    setSaveStatus('idle');
    setTab(t);
  };

  const resetForm = () => {
    setName(''); setPhone(''); setBedrooms('1');
    setCity(CITIES[0]); setCallBackDate(''); setQuickWeeks(null); setNotes('');
    setNameError(false);
  };

  const handleQuickWeek = (weeks: number) => {
    setCallBackDate(weeksFromNow(weeks));
    setQuickWeeks(weeks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setNameError(true); return; }
    setNameError(false);
    setSaveStatus('saving');

    const lead: Lead = {
      id: crypto.randomUUID(),
      name: name.trim(), phone: phone.trim(), bedrooms, city,
      callBackDate, notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [lead, ...leads];
    setLeads(updated);
    persist(updated);
    resetForm();
    setSaveStatus('saved');

    if (autoSwitchRef.current) clearTimeout(autoSwitchRef.current);
    autoSwitchRef.current = setTimeout(() => { setSaveStatus('idle'); setTab('list'); }, 1400);

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    }).catch(() => {});
  };

  const requestDelete = (id: string) => setPendingDelete(id);

  const confirmDelete = (id: string) => {
    const updated = leads.filter(l => l.id !== id);
    setLeads(updated);
    persist(updated);
    setPendingDelete(null);
    if (filter !== 'all' && updated.filter(l => l.bedrooms === filter).length === 0) setFilter('all');
  };

  const startEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setEditDraft({ ...lead });
    setEditQuickWeeks(null);
    setPendingDelete(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft(null); setEditQuickWeeks(null); };

  const handleEditQuickWeek = (weeks: number) => {
    if (!editDraft) return;
    setEditDraft({ ...editDraft, callBackDate: weeksFromNow(weeks) });
    setEditQuickWeeks(weeks);
  };

  const saveEdit = () => {
    if (!editDraft || !editDraft.name.trim()) return;
    const saved: Lead = {
      ...editDraft,
      name: editDraft.name.trim(),
      phone: editDraft.phone.trim(),
      notes: editDraft.notes.trim(),
    };
    const updated = leads.map(l => l.id === saved.id ? saved : l);
    setLeads(updated);
    persist(updated);
    setEditingId(null); setEditDraft(null); setEditQuickWeeks(null);
  };

  const visible = filter === 'all' ? leads : leads.filter(l => l.bedrooms === filter);

  return (
    <div className="flex flex-col bg-iron-500 font-sans" style={{ height: '100dvh' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-black px-5" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="h-24 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/canyon-logo.png" alt="Canyon Apartments" className="h-14 w-auto" />
          <div className="flex flex-col gap-1">
            <p className="font-display text-xl font-bold uppercase tracking-widest text-white leading-none">
              Canyon Apts
            </p>
            <p className="text-sm text-iron-300 tracking-wide leading-none">Follow-Up List</p>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">

        {/* ─── ADD FORM ────────────────────────────────────────────────────── */}
        {tab === 'add' && (
          <div className="px-4 pt-3 pb-4">

            {saveStatus === 'saved' && (
              <div className="mb-3 rounded-xl bg-green-100 border border-green-300 px-4 py-2 flex items-center gap-2 text-green-800 text-sm font-medium">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved! Opening your list…
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-iron-200 rounded-2xl shadow-sm border border-iron-300 p-4 space-y-3">

              <div>
                <label className={labelCls}>Name</label>
                <input
                  type="text" required maxLength={80}
                  placeholder="First and last name"
                  value={name}
                  onChange={e => { setName(e.target.value); if (nameError) setNameError(false); }}
                  className={`${inputCls} ${nameError ? 'border-red-400 ring-2 ring-red-300' : ''}`}
                />
                {nameError && <p className="mt-1 text-xs text-red-600 font-medium">Please enter a name.</p>}
              </div>

              <div>
                <label className={labelCls}>Phone Number</label>
                <input
                  type="tel" required maxLength={20}
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
                      {BEDROOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                  Call Back Date <span className="text-iron-500 font-normal">(optional)</span>
                </label>
                <QuickWeekButtons activeWeeks={quickWeeks} onSelect={handleQuickWeek} />
                <DateInput
                  value={callBackDate}
                  onChange={e => { setCallBackDate(e.target.value); setQuickWeeks(null); }}
                />
                {callBackDate && (
                  <p className="mt-1 text-xs text-iron-600 font-medium">
                    Set to: <span className="text-iron-800">{formatDate(callBackDate)}</span>
                    <button
                      type="button"
                      onClick={() => { setCallBackDate(''); setQuickWeeks(null); }}
                      className="ml-2 text-iron-500 hover:text-red-500 transition-colors"
                    >
                      Clear ✕
                    </button>
                  </p>
                )}
              </div>

              <div>
                <label className={labelCls}>
                  Notes <span className="text-iron-500 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2} maxLength={500}
                  placeholder="What did you talk about? Any special requests?"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
                {notes.length > 400 && (
                  <p className="mt-1 text-xs text-iron-500 text-right">{500 - notes.length} left</p>
                )}
              </div>

              <button
                type="submit"
                disabled={saveStatus !== 'idle'}
                className="w-full rounded-xl bg-brand-600 py-3 text-base font-semibold text-white hover:bg-brand-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-60"
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
                      : 'bg-iron-300 text-iron-700 border border-iron-400',
                  ].join(' ')}
                >
                  {f === 'all' ? `All (${leads.length})` : `${f}BR`}
                </button>
              ))}
            </div>

            {visible.length === 0 && (
              <div className="mt-16 flex flex-col items-center gap-3 text-center px-8">
                <List size={40} className="text-iron-400" />
                <p className="font-medium text-iron-300">
                  {leads.length === 0 ? 'No follow-ups yet.' : `No ${filter}BR follow-ups.`}
                </p>
                {leads.length === 0 && (
                  <p className="text-sm text-iron-400">
                    Tap{' '}
                    <button
                      onClick={() => switchTab('add')}
                      className="text-brand-400 font-medium underline underline-offset-2"
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
                  <div
                    key={lead.id}
                    className={[
                      'rounded-2xl border shadow-sm p-4 transition-colors duration-150',
                      isOverdue(lead.callBackDate)
                        ? 'bg-red-100 border-red-300'
                        : 'bg-iron-200 border-iron-300',
                    ].join(' ')}
                  >

                    {/* ── EDIT MODE ── */}
                    {editingId === lead.id && editDraft ? (
                      <div className="space-y-3">
                        <input type="text" maxLength={80} value={editDraft.name}
                          onChange={e => setEditDraft({ ...editDraft, name: e.target.value })}
                          className={inputCls} placeholder="Name" />
                        <input type="tel" maxLength={20} value={editDraft.phone}
                          onChange={e => setEditDraft({ ...editDraft, phone: e.target.value })}
                          className={inputCls} placeholder="Phone" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <select value={editDraft.bedrooms}
                              onChange={e => setEditDraft({ ...editDraft, bedrooms: e.target.value as BedroomVal })}
                              className={`${inputCls} appearance-none pr-8 py-2.5 text-sm`}>
                              {BEDROOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <Chevron />
                          </div>
                          <div className="relative">
                            <select value={editDraft.city}
                              onChange={e => setEditDraft({ ...editDraft, city: e.target.value })}
                              className={`${inputCls} appearance-none pr-8 py-2.5 text-sm`}>
                              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <Chevron />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-iron-700 mb-2">Call Back Date</p>
                          <QuickWeekButtons activeWeeks={editQuickWeeks} onSelect={handleEditQuickWeek} />
                          <DateInput
                            value={editDraft.callBackDate}
                            onChange={e => { setEditDraft({ ...editDraft, callBackDate: e.target.value }); setEditQuickWeeks(null); }}
                            className={`${inputCls} py-2.5 text-sm pr-10`}
                          />
                          {editDraft.callBackDate && (
                            <p className="mt-1 text-xs text-iron-600">
                              {formatDate(editDraft.callBackDate)}
                              <button type="button"
                                onClick={() => { setEditDraft({ ...editDraft, callBackDate: '' }); setEditQuickWeeks(null); }}
                                className="ml-2 text-iron-400 hover:text-red-500 transition-colors">
                                Clear ✕
                              </button>
                            </p>
                          )}
                        </div>
                        <textarea rows={2} maxLength={500} value={editDraft.notes}
                          onChange={e => setEditDraft({ ...editDraft, notes: e.target.value })}
                          className={`${inputCls} resize-none py-2.5 text-sm`} placeholder="Notes" />
                        <div className="flex gap-2">
                          <button onClick={saveEdit}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
                            <Check size={14} /> Save
                          </button>
                          <button onClick={cancelEdit}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-iron-300 py-2.5 text-sm font-semibold text-iron-700 hover:bg-iron-400 transition-colors">
                            <X size={14} /> Cancel
                          </button>
                        </div>
                      </div>

                    ) : (

                    /* ── DISPLAY MODE ── */
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-iron-900 leading-tight truncate">{lead.name}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="inline-block rounded-full bg-brand-100 border border-brand-200 px-2.5 py-0.5 text-xs font-medium text-brand-800">
                              {lead.bedrooms}BR · {lead.city}
                            </span>
                            <span className="text-xs text-iron-500">{timeAgo(lead.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => startEdit(lead)}
                            className="p-1.5 rounded-lg text-iron-400 hover:text-brand-600 hover:bg-brand-100 transition-all duration-150"
                            aria-label="Edit">
                            <Pencil size={15} />
                          </button>
                          {pendingDelete === lead.id ? (
                            <>
                              <button onClick={() => confirmDelete(lead.id)}
                                className="p-1.5 rounded-lg bg-red-500 text-white transition-all duration-150"
                                aria-label="Confirm delete">
                                <Check size={15} />
                              </button>
                              <button onClick={() => setPendingDelete(null)}
                                className="p-1.5 rounded-lg text-iron-500 hover:text-iron-700 transition-all duration-150"
                                aria-label="Cancel delete">
                                <X size={15} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => requestDelete(lead.id)}
                              className="p-1.5 rounded-lg text-iron-400 hover:text-red-500 hover:bg-red-100 transition-all duration-150"
                              aria-label={`Delete ${lead.name}`}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      <a href={`tel:${lead.phone.replace(/\D/g, '')}`}
                        className="mt-3 flex items-center gap-2 text-brand-700 font-medium text-sm">
                        <Phone size={14} />
                        {lead.phone}
                      </a>

                      {lead.notes && (
                        <p className="mt-2 text-sm text-iron-600 leading-relaxed">{lead.notes}</p>
                      )}

                      {lead.callBackDate && (
                        <div className={[
                          'mt-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2',
                          isOverdue(lead.callBackDate)
                            ? 'bg-red-200 border border-red-300'
                            : 'bg-iron-300 border border-iron-400',
                        ].join(' ')}>
                          <p className={`text-xs font-medium ${isOverdue(lead.callBackDate) ? 'text-red-700' : 'text-iron-700'}`}>
                            {isOverdue(lead.callBackDate) ? '⚠ Overdue · ' : 'Call back · '}
                            <span className="font-semibold">{formatDate(lead.callBackDate)}</span>
                          </p>
                          <a href={calendarUrl(lead)} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1.5 rounded-md bg-white border border-iron-300 px-2.5 py-1 text-xs font-medium text-iron-700 hover:bg-iron-100 transition-colors duration-150">
                            <CalendarPlus size={11} />
                            Calendar
                          </a>
                        </div>
                      )}
                    </>
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
        className="shrink-0 bg-black border-t border-iron-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="h-16 flex">
          <button
            onClick={() => switchTab('add')}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150',
              tab === 'add' ? 'text-brand-500' : 'text-iron-400',
            ].join(' ')}
          >
            <PlusCircle size={22} strokeWidth={tab === 'add' ? 2.5 : 1.75} />
            Add Person
          </button>
          <button
            onClick={() => switchTab('list')}
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
