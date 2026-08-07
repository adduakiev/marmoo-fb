import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  bulkUpsertSharedReviews,
  createSharedReview,
  hasSharedReviewsApi,
  listSharedReviews,
  type SharedReview,
  type SharedReviewStatus,
  updateSharedReview,
} from './reviewsApi';

type Status = SharedReviewStatus;
type Review = SharedReview;

type Business = {
  name: string;
  address: string;
  googleRating: number;
  sampleAverage: number;
  totalAnalyzed: number;
  latestReview: string;
  reviewsWithPhotos: number;
};

type Payload = {
  business: Business;
  reviews: Review[];
};

type SyncState = 'loading' | 'synced' | 'saving' | 'offline' | 'error';
type LightboxState = { images: string[]; index: number } | null;

const DATA_URL = `${import.meta.env.BASE_URL || '/'}google-reviews.json`;
const CACHE_KEY = 'marmoo-review-management-cache-v2';

const STATUS: Record<Status, string> = {
  new: 'Новий',
  needs_reply: 'Без відповіді',
  draft: 'Чернетка',
  sent: 'Відповідь надіслана',
  closed: 'Закрито',
};

const clean = (value: unknown) => String(value ?? '').trim();

const DEFAULT_BUSINESS: Business = {
  name: 'MARMOO бістро мармурової яловичини',
  address: 'вулиця Велика Васильківська, 57/3, Київ, 02000',
  googleRating: 4.4,
  sampleAverage: 4.35,
  totalAnalyzed: 40,
  latestReview: '2026-07-30',
  reviewsWithPhotos: 19,
};

function splitCsv(line: string): string[] {
  const output: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === ',' && !quoted) {
      output.push(current);
      current = '';
      continue;
    }
    current += character;
  }

  output.push(current);
  return output;
}

function parseCsv(raw: string): Review[] {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsv(lines[0]);

  return lines.slice(1).map((line, index) => {
    const columns = splitCsv(line);
    const row = Object.fromEntries(
      headers.map((header, columnIndex) => [header, columns[columnIndex] ?? '']),
    );
    const url = clean(row['Review URL']);
    const images = clean(row['Review image'])
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);

    return {
      id: url || `manual-${Date.now()}-${index}`,
      source: 'Google',
      date: clean(row['Review date']),
      url,
      author: clean(row['Author name']) || 'Без імені',
      authorUrl: clean(row['Author URL']),
      localGuide: clean(row['Local Guide']).toLowerCase() === 'true',
      authorReviews: Number(row['Author reviews']) || 0,
      rating: Number(row['Star rating']) || null,
      content: clean(row['Review content']),
      images,
      video: clean(row['Review video']) || null,
      status: 'needs_reply',
      reply: '',
      internalNote: '',
      assignee: '',
      respondedAt: '',
      createdAt: clean(row['Review date']),
      updatedAt: '',
      tags: [],
    };
  });
}

const stars = (value: number | null) =>
  value ? `${'★'.repeat(value)}${'☆'.repeat(5 - value)}` : 'Без оцінки';

const sortReviews = (reviews: Review[]) =>
  [...reviews].sort((a, b) => {
    const dateDiff = String(b.date).localeCompare(String(a.date));
    if (dateDiff !== 0) return dateDiff;
    return String(b.updatedAt || b.createdAt || '').localeCompare(
      String(a.updatedAt || a.createdAt || ''),
    );
  });

function statusTone(status: Status) {
  if (status === 'sent' || status === 'closed') return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100';
  if (status === 'draft') return 'border-sky-300/20 bg-sky-300/10 text-sky-100';
  if (status === 'new') return 'border-violet-300/20 bg-violet-300/10 text-violet-100';
  return 'border-amber-300/20 bg-amber-300/10 text-amber-100';
}

export default function ReviewManagementDashboard() {
  const [data, setData] = useState<Payload>({ business: DEFAULT_BUSINESS, reviews: [] });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [rating, setRating] = useState('all');
  const [selected, setSelected] = useState<Review | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [syncState, setSyncState] = useState<SyncState>('loading');
  const [syncMessage, setSyncMessage] = useState('Підключення до спільної бази…');
  const [lastSyncedAt, setLastSyncedAt] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const updateDataReviews = useCallback((reviews: Review[]) => {
    const sorted = sortReviews(reviews);
    setData(previous => ({ ...previous, reviews: sorted }));
    localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
  }, []);

  const refresh = useCallback(
    async (silent = false) => {
      if (!hasSharedReviewsApi) {
        if (!silent) {
          setSyncState('offline');
          setSyncMessage('Спільна база не налаштована');
        }
        return;
      }

      if (!silent) {
        setSyncState('loading');
        setSyncMessage('Оновлюємо спільну базу…');
      }

      try {
        const reviews = await listSharedReviews();
        updateDataReviews(reviews);
        setSyncState('synced');
        setSyncMessage('Спільна база синхронізована');
        setLastSyncedAt(new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }));
      } catch (error) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached && data.reviews.length === 0) {
          try {
            updateDataReviews(JSON.parse(cached) as Review[]);
          } catch {
            // Ignore malformed cache.
          }
        }
        setSyncState('error');
        setSyncMessage(error instanceof Error ? error.message : 'Помилка синхронізації');
      }
    },
    [data.reviews.length, updateDataReviews],
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const response = await fetch(DATA_URL, { cache: 'no-store' });
        if (response.ok) {
          const payload = (await response.json()) as Partial<Payload>;
          if (!cancelled && payload.business) {
            setData(previous => ({ ...previous, business: { ...DEFAULT_BUSINESS, ...payload.business } }));
          }
        }
      } catch {
        // Business meta is optional.
      }
      if (!cancelled) await refresh();
    };

    void bootstrap();
    const interval = window.setInterval(() => void refresh(true), 30_000);
    const onFocus = () => void refresh(true);
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const filtered = useMemo(
    () =>
      data.reviews.filter(review => {
        if (status !== 'all' && review.status !== status) return false;
        if (rating !== 'all' && review.rating !== Number(rating)) return false;
        const normalizedQuery = query.toLowerCase();
        return (
          !normalizedQuery ||
          [review.author, review.content, review.reply, review.source, review.assignee].some(value =>
            String(value || '').toLowerCase().includes(normalizedQuery),
          )
        );
      }),
    [data.reviews, query, rating, status],
  );

  const stats = useMemo(() => {
    const total = data.reviews.length;
    const rated = data.reviews.filter(review => review.rating !== null);
    const average = rated.length
      ? rated.reduce((sum, review) => sum + (review.rating ?? 0), 0) / rated.length
      : 0;
    const unanswered = data.reviews.filter(review =>
      ['new', 'needs_reply', 'draft'].includes(review.status),
    ).length;
    const critical = data.reviews.filter(review => (review.rating ?? 5) <= 2).length;
    const answered = data.reviews.filter(review => ['sent', 'closed'].includes(review.status)).length;
    return {
      total,
      average,
      unanswered,
      critical,
      answered,
      answeredRate: total ? (answered / total) * 100 : 0,
    };
  }, [data.reviews]);

  const saveChanges = async (id: string, changes: Partial<Review>) => {
    const previous = data.reviews;
    const optimistic = previous.map(review => (review.id === id ? { ...review, ...changes } : review));
    updateDataReviews(optimistic);
    setSyncState('saving');
    setSyncMessage('Зберігаємо…');

    try {
      const saved = await updateSharedReview(id, changes);
      updateDataReviews(optimistic.map(review => (review.id === id ? saved : review)));
      setSelected(saved);
      setSyncState('synced');
      setSyncMessage('Збережено у спільній базі');
      setLastSyncedAt(new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      updateDataReviews(previous);
      setSyncState('error');
      setSyncMessage(error instanceof Error ? error.message : 'Не вдалося зберегти');
      throw error;
    }
  };

  const importFile = async (file: File) => {
    const reviews = parseCsv(await file.text());
    if (!reviews.length) return;
    setSyncState('saving');
    setSyncMessage(`Синхронізуємо ${reviews.length} відгуків…`);
    try {
      const result = await bulkUpsertSharedReviews(reviews);
      setSyncMessage(`Імпортовано: ${result.created}, оновлено: ${result.updated}`);
      await refresh(true);
    } catch (error) {
      setSyncState('error');
      setSyncMessage(error instanceof Error ? error.message : 'Помилка імпорту');
    }
  };

  const addReview = async (review: Review) => {
    setSyncState('saving');
    setSyncMessage('Додаємо відгук…');
    try {
      const created = await createSharedReview(review);
      updateDataReviews([created, ...data.reviews.filter(item => item.id !== created.id)]);
      setAddOpen(false);
      setSyncState('synced');
      setSyncMessage('Відгук додано у спільну базу');
      setLastSyncedAt(new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      setSyncState('error');
      setSyncMessage(error instanceof Error ? error.message : 'Не вдалося додати відгук');
    }
  };

  const cards: Array<[string, string | number, string]> = [
    ['Усього', stats.total, 'всі джерела'],
    ['Середня оцінка', stats.average ? stats.average.toFixed(2) : '—', 'за вибіркою'],
    ['Google-рейтинг', data.business.googleRating, 'поточний профіль'],
    ['Без відповіді', stats.unanswered, 'потребують дії'],
    ['Критичні', stats.critical, '1–2 зірки'],
    ['Опрацьовано', `${stats.answeredRate.toFixed(0)}%`, `${stats.answered} відгуків`],
  ];

  const syncTone =
    syncState === 'synced'
      ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
      : syncState === 'saving' || syncState === 'loading'
        ? 'border-amber-300/20 bg-amber-300/10 text-amber-100'
        : 'border-rose-300/20 bg-rose-300/10 text-rose-100';

  return (
    <main className="mx-auto max-w-[1600px] px-3 py-5 text-white md:px-6 md:py-7">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(207,238,237,.12),transparent_32%),linear-gradient(135deg,rgba(255,255,255,.065),rgba(255,255,255,.025))] p-5 shadow-[0_28px_80px_rgba(20,0,8,.28)] md:p-8">
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.26em] text-[#cfeeed]/55">
              Reputation management
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-[-.035em] text-[#e3faf8] md:text-[44px]">
              Керування відгуками
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Єдина робоча зона для Google, Instagram та інших джерел — від першого сигналу до публічної відповіді.
            </p>
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold ${syncTone}`}>
              {(syncState === 'loading' || syncState === 'saving') ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : syncState === 'synced' ? (
                <CheckCircle2 size={13} />
              ) : null}
              {syncMessage}{lastSyncedAt ? ` · ${lastSyncedAt}` : ''}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={input}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
                event.currentTarget.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.055] px-4 py-3 text-sm font-black text-white/75 transition hover:-translate-y-0.5 hover:bg-white/[.09]"
            >
              <RefreshCw size={16} /> Оновити
            </button>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.055] px-4 py-3 text-sm font-black text-white/75 transition hover:-translate-y-0.5 hover:bg-white/[.09]"
            >
              <ImageIcon size={16} /> Імпорт CSV
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#cfeeed] px-5 py-3 text-sm font-black text-[#531027] shadow-[0_12px_35px_rgba(207,238,237,.12)] transition hover:-translate-y-0.5 hover:bg-[#e0f7f5]"
            >
              <Plus size={16} /> Додати відгук
            </button>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(([label, value, hint]) => (
          <div key={label} className="group rounded-[22px] border border-white/[.075] bg-white/[.035] p-4 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[.055]">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-white/38">{label}</div>
            <div className="mt-2 text-[26px] font-black tracking-tight text-[#def7f5]">{value}</div>
            <div className="mt-1 text-[11px] text-white/30">{hint}</div>
          </div>
        ))}
      </section>

      <section className="sticky top-2 z-20 mt-4 rounded-[22px] border border-white/10 bg-[#3f0618]/90 p-3 shadow-[0_14px_40px_rgba(0,0,0,.18)] backdrop-blur-xl">
        <div className="grid gap-2 md:grid-cols-[1fr_190px_150px]">
          <label className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Пошук за автором, текстом, відповіддю або відповідальним"
              className="w-full rounded-2xl border border-white/10 bg-white/[.045] py-3.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-white/28 focus:border-[#cfeeed]/30 focus:bg-white/[.065]"
            />
          </label>
          <select
            value={status}
            onChange={event => setStatus(event.target.value as 'all' | Status)}
            className="rounded-2xl border border-white/10 bg-[#4c061c] px-3 py-3.5 text-sm outline-none"
          >
            <option value="all">Усі статуси</option>
            {Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select
            value={rating}
            onChange={event => setRating(event.target.value)}
            className="rounded-2xl border border-white/10 bg-[#4c061c] px-3 py-3.5 text-sm outline-none"
          >
            <option value="all">Усі оцінки</option>
            {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} зірок</option>)}
          </select>
        </div>
      </section>

      <section className="mt-4 grid gap-4">
        {filtered.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[.025] p-14 text-center text-white/42">
            {syncState === 'loading' ? 'Завантажуємо відгуки…' : 'Відгуків за вибраними умовами немає.'}
          </div>
        ) : (
          filtered.map(review => (
            <article
              key={review.id}
              className={`group relative overflow-hidden rounded-[28px] border p-5 shadow-[0_16px_45px_rgba(25,0,10,.12)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(25,0,10,.22)] md:p-6 ${
                review.rating && review.rating <= 2
                  ? 'border-[#f08aa5]/35 bg-[linear-gradient(135deg,rgba(240,138,165,.09),rgba(255,255,255,.025))]'
                  : 'border-white/[.085] bg-[linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.025))]'
              }`}
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#cfeeed]/10 bg-[#cfeeed]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#d8f4f2]">{review.source}</span>
                    <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${statusTone(review.status)}`}>{STATUS[review.status]}</span>
                    {review.images.length > 0 && (
                      <button type="button" onClick={() => setLightbox({ images: review.images, index: 0 })} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-white/45 transition hover:bg-white/[.06] hover:text-white/75">
                        <ImageIcon size={13} /> {review.images.length} фото
                      </button>
                    )}
                    {review.assignee && <span className="inline-flex items-center gap-1.5 text-xs text-white/38"><UserRound size={13} /> {review.assignee}</span>}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h2 className="text-[17px] font-black text-white">{review.author}</h2>
                    <span className="font-black tracking-[.06em] text-[#f3c969]">{stars(review.rating)}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-white/35"><CalendarDays size={13} /> {review.date}</span>
                  </div>

                  <p className="mt-3 max-w-5xl whitespace-pre-wrap text-[14px] leading-6 text-white/68">{review.content || 'Відгук без тексту'}</p>

                  {review.images.length > 0 && (
                    <ReviewGallery images={review.images} onOpen={index => setLightbox({ images: review.images, index })} />
                  )}

                  {review.reply && (
                    <div className="mt-4 rounded-[20px] border border-[#cfeeed]/12 bg-[#cfeeed]/[.045] p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-[#cfeeed]/55"><MessageSquareText size={13} /> Наша відповідь</div>
                      <p className="mt-2 text-sm leading-6 text-white/68">{review.reply}</p>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 gap-2 xl:w-[150px] xl:flex-col">
                  <button
                    type="button"
                    onClick={() => setSelected(review)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#cfeeed] px-4 py-3 text-sm font-black text-[#531027] transition hover:bg-[#e2f8f6] xl:flex-none"
                  >
                    <MessageSquareText size={15} /> Опрацювати
                  </button>
                  {review.url && (
                    <a href={review.url} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm font-black text-white/55 transition hover:bg-white/[.06] hover:text-white/80 xl:flex-none">
                      <ExternalLink size={15} /> Оригінал
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {selected && (
        <ReviewModal
          review={selected}
          onClose={() => setSelected(null)}
          onSave={changes => saveChanges(selected.id, changes)}
          onOpenImage={index => setLightbox({ images: selected.images, index })}
        />
      )}
      {addOpen && <AddModal onClose={() => setAddOpen(false)} onAdd={addReview} />}
      {lightbox && <PhotoLightbox state={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />}
    </main>
  );
}

function ReviewGallery({ images, onOpen }: { images: string[]; onOpen: (index: number) => void }) {
  const visible = images.slice(0, 4);
  return (
    <div className="mt-4 grid max-w-[620px] grid-cols-4 gap-2">
      {visible.map((image, index) => {
        const remaining = images.length - 4;
        return (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => onOpen(index)}
            className={`group/photo relative overflow-hidden rounded-[16px] border border-white/10 bg-black/20 ${index === 0 && images.length > 1 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'}`}
          >
            <img src={image} alt={`Фото з відгуку ${index + 1}`} className="h-full w-full object-cover transition duration-300 group-hover/photo:scale-[1.06]" loading="lazy" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover/photo:bg-black/30 group-hover/photo:opacity-100"><ZoomIn size={21} /></span>
            {index === 3 && remaining > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-black text-white">+{remaining}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PhotoLightbox({ state, onChange, onClose }: { state: NonNullable<LightboxState>; onChange: (next: LightboxState) => void; onClose: () => void }) {
  const { images, index } = state;
  const previous = useCallback(() => onChange({ images, index: (index - 1 + images.length) % images.length }), [images, index, onChange]);
  const next = useCallback(() => onChange({ images, index: (index + 1) % images.length }), [images, index, onChange]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && images.length > 1) previous();
      if (event.key === 'ArrowRight' && images.length > 1) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, next, onClose, previous]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#120108]/92 p-3 backdrop-blur-xl md:p-8" onClick={onClose}>
      <div className="relative flex h-full w-full max-w-6xl items-center justify-center" onClick={event => event.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Закрити фото" className="absolute right-0 top-0 z-10 rounded-full border border-white/15 bg-black/35 p-3 text-white/75 transition hover:bg-white/10 hover:text-white"><X size={22} /></button>
        <div className="absolute left-3 top-3 z-10 rounded-full bg-black/45 px-3 py-1.5 text-xs font-black text-white/70">{index + 1} / {images.length}</div>
        {images.length > 1 && (
          <>
            <button type="button" onClick={previous} aria-label="Попереднє фото" className="absolute left-0 z-10 rounded-full border border-white/15 bg-black/35 p-3 text-white/75 transition hover:bg-white/10 hover:text-white md:left-3"><ChevronLeft size={26} /></button>
            <button type="button" onClick={next} aria-label="Наступне фото" className="absolute right-0 z-10 rounded-full border border-white/15 bg-black/35 p-3 text-white/75 transition hover:bg-white/10 hover:text-white md:right-3"><ChevronRight size={26} /></button>
          </>
        )}
        <img src={images[index]} alt={`Фото відгуку ${index + 1}`} className="max-h-[88vh] max-w-full rounded-[20px] object-contain shadow-[0_30px_100px_rgba(0,0,0,.55)]" />
      </div>
    </div>
  );
}

function ReviewModal({ review, onClose, onSave, onOpenImage }: { review: Review; onClose: () => void; onSave: (changes: Partial<Review>) => Promise<void>; onOpenImage: (index: number) => void }) {
  const [reply, setReply] = useState(review.reply);
  const [note, setNote] = useState(review.internalNote);
  const [assignee, setAssignee] = useState(review.assignee);
  const [status, setStatus] = useState<Status>(review.status);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        reply,
        internalNote: note,
        assignee,
        status,
        respondedAt: status === 'sent' && !review.respondedAt ? new Date().toISOString() : review.respondedAt,
      });
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!reply) return;
    await navigator.clipboard.writeText(reply);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[#160109]/78 p-0 backdrop-blur-md lg:items-center lg:p-6">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[30px] border border-white/12 bg-[#350313] text-white shadow-[0_40px_120px_rgba(0,0,0,.45)] lg:max-h-[92vh] lg:rounded-[30px]">
        <header className="flex items-start justify-between gap-4 border-b border-white/[.08] bg-white/[.025] px-5 py-4 md:px-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#cfeeed]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[#d8f4f2]">{review.source}</span>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusTone(status)}`}>{STATUS[status]}</span>
            </div>
            <h2 className="mt-2 truncate text-xl font-black tracking-tight md:text-2xl">Опрацювання відгуку · {review.author}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[.035] p-2.5 text-white/55 transition hover:bg-white/[.08] hover:text-white"><X size={20} /></button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[.92fr_1.08fr] lg:overflow-hidden">
          <aside className="border-b border-white/[.08] bg-black/[.08] p-5 lg:overflow-y-auto lg:border-b-0 lg:border-r md:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#cfeeed]/10 text-sm font-black text-[#d8f4f2]">{review.author.slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="font-black">{review.author}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/35"><span>{review.date}</span>{review.localGuide && <span>Local Guide</span>}{review.authorReviews ? <span>{review.authorReviews} відгуків</span> : null}</div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span className="text-lg font-black tracking-[.08em] text-[#f3c969]">{stars(review.rating)}</span>
              {review.rating !== null && <span className="rounded-full bg-white/[.045] px-2.5 py-1 text-xs font-black text-white/45">{review.rating}/5</span>}
            </div>

            <div className="mt-4 rounded-[22px] border border-white/[.075] bg-white/[.035] p-4 text-sm leading-6 text-white/68 md:p-5">{review.content || 'Відгук без тексту'}</div>

            {review.images.length > 0 && <ReviewGallery images={review.images} onOpen={onOpenImage} />}

            <div className="mt-5 flex flex-wrap gap-2">
              {review.url && <a href={review.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2.5 text-xs font-black text-white/55 transition hover:bg-white/[.06] hover:text-white/80"><ExternalLink size={14} /> Відкрити оригінал</a>}
              {review.authorUrl && <a href={review.authorUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2.5 text-xs font-black text-white/55 transition hover:bg-white/[.06] hover:text-white/80"><UserRound size={14} /> Профіль автора</a>}
            </div>
          </aside>

          <section className="p-5 lg:overflow-y-auto md:p-7">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-[11px] font-black uppercase tracking-[.12em] text-white/40">
                Статус опрацювання
                <select value={status} onChange={event => setStatus(event.target.value as Status)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#4c061c] p-3.5 text-sm normal-case tracking-normal text-white outline-none focus:border-[#cfeeed]/30">
                  {Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-black uppercase tracking-[.12em] text-white/40">
                Відповідальний
                <div className="relative mt-2">
                  <UserRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={assignee} onChange={event => setAssignee(event.target.value)} placeholder="Ім’я працівника" className="w-full rounded-2xl border border-white/10 bg-white/[.04] py-3.5 pl-10 pr-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-[#cfeeed]/30" />
                </div>
              </label>
            </div>

            <div className="mt-5 rounded-[22px] border border-[#cfeeed]/12 bg-[#cfeeed]/[.035] p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[.13em] text-[#cfeeed]/55">Публічна відповідь</div>
                  <div className="mt-1 text-xs text-white/30">Текст, який піде гостю у відповідь</div>
                </div>
                <button type="button" onClick={() => void copy()} disabled={!reply} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs font-black text-white/55 transition hover:bg-white/[.07] hover:text-white disabled:opacity-35"><Clipboard size={14} /> {copied ? 'Скопійовано' : 'Копіювати'}</button>
              </div>
              <textarea value={reply} onChange={event => setReply(event.target.value)} rows={7} placeholder="Напишіть відповідь гостю…" className="mt-4 w-full resize-y rounded-[18px] border border-white/10 bg-[#2d020f]/55 p-4 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-[#cfeeed]/30" />
              <div className="mt-2 text-right text-[11px] text-white/25">{reply.length} символів</div>
            </div>

            <label className="mt-5 block text-[11px] font-black uppercase tracking-[.12em] text-white/40">
              Внутрішній коментар
              <textarea value={note} onChange={event => setNote(event.target.value)} rows={4} placeholder="Що важливо зафіксувати для команди — не бачить гість" className="mt-2 w-full rounded-[18px] border border-white/10 bg-white/[.035] p-4 text-sm normal-case leading-6 tracking-normal text-white outline-none placeholder:text-white/25 focus:border-[#cfeeed]/30" />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-white/[.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-white/28">{review.updatedAt ? `Остання зміна: ${review.updatedAt}` : 'Зміни синхронізуються зі спільною базою'}</div>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white/55 transition hover:bg-white/[.05] hover:text-white">Закрити</button>
                <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex min-w-[145px] items-center justify-center gap-2 rounded-2xl bg-[#cfeeed] px-5 py-3 text-sm font-black text-[#531027] transition hover:bg-[#e2f8f6] disabled:opacity-50">{saving ? <><RefreshCw size={15} className="animate-spin" /> Зберігаємо…</> : <><CheckCircle2 size={15} /> Зберегти</>}</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (review: Review) => Promise<void> }) {
  const [source, setSource] = useState('Instagram');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setSaving(true);
    try {
      await onAdd({
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        source,
        date: new Date().toISOString().slice(0, 10),
        url,
        author: author || 'Без імені',
        rating,
        content,
        images: [],
        status: 'needs_reply',
        reply: '',
        internalNote: '',
        assignee: '',
        respondedAt: '',
        createdAt: new Date().toISOString(),
        updatedAt: '',
        tags: [],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#160109]/78 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/12 bg-[#350313] text-white shadow-[0_35px_100px_rgba(0,0,0,.45)]">
        <div className="flex items-center justify-between border-b border-white/[.08] bg-white/[.025] px-6 py-5"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-[#cfeeed]/45">Manual review</div><h2 className="mt-1 text-xl font-black">Додати відгук</h2></div><button type="button" onClick={onClose} className="rounded-full border border-white/10 p-2 text-white/55 hover:bg-white/[.06] hover:text-white"><X size={19} /></button></div>
        <div className="grid gap-3 p-6">
          <select value={source} onChange={event => setSource(event.target.value)} className="rounded-2xl border border-white/10 bg-[#4c061c] p-3.5 outline-none"><option>Instagram</option><option>Google</option><option>ChoiceQR</option><option>Glovo</option><option>Bolt</option><option>Інше</option></select>
          <input value={author} onChange={event => setAuthor(event.target.value)} placeholder="Автор або нік" className="rounded-2xl border border-white/10 bg-white/[.04] p-3.5 outline-none placeholder:text-white/25" />
          <div className="relative"><Link2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" /><input value={url} onChange={event => setUrl(event.target.value)} placeholder="Посилання на оригінал — необов’язково" className="w-full rounded-2xl border border-white/10 bg-white/[.04] py-3.5 pl-10 pr-3 outline-none placeholder:text-white/25" /></div>
          <select value={rating ?? ''} onChange={event => setRating(event.target.value ? Number(event.target.value) : null)} className="rounded-2xl border border-white/10 bg-[#4c061c] p-3.5 outline-none"><option value="">Без оцінки</option>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} зірок</option>)}</select>
          <textarea value={content} onChange={event => setContent(event.target.value)} rows={6} placeholder="Текст відгуку" className="rounded-[18px] border border-white/10 bg-white/[.04] p-4 leading-6 outline-none placeholder:text-white/25" />
        </div>
        <div className="flex justify-end gap-2 border-t border-white/[.08] px-6 py-4"><button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-4 py-3 font-black text-white/55 hover:bg-white/[.05] hover:text-white">Скасувати</button><button type="button" disabled={!content.trim() || saving} onClick={() => void add()} className="rounded-2xl bg-[#cfeeed] px-5 py-3 font-black text-[#531027] disabled:opacity-40">{saving ? 'Додаємо…' : 'Додати'}</button></div>
      </div>
    </div>
  );
}
