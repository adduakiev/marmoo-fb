export type SharedReviewStatus = 'new' | 'needs_reply' | 'draft' | 'sent' | 'closed';

export type SharedReview = {
  id: string;
  source: string;
  date: string;
  url: string;
  author: string;
  authorUrl?: string;
  localGuide?: boolean;
  authorReviews?: number;
  rating: number | null;
  content: string;
  images: string[];
  video?: string | null;
  status: SharedReviewStatus;
  reply: string;
  internalNote: string;
  assignee: string;
  respondedAt: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
};

type ListResponse = { ok: boolean; reviews?: SharedReview[]; error?: string; updatedAt?: string };
type MutationResponse = { ok: boolean; review?: SharedReview; error?: string };
type BulkResponse = { ok: boolean; created?: number; updated?: number; error?: string };

const API_URL = String(import.meta.env.VITE_REVIEWS_API_URL || '').trim();

export const hasSharedReviewsApi = Boolean(API_URL);

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 45000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError' && !(error instanceof TypeError)) throw error;
    throw new Error(options.method === 'POST' ? 'Не отримано підтвердження збереження. Оновіть список перед повторною спробою.' : 'Не вдалося завантажити відгуки. Перевірте з’єднання та повторіть.');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) throw new Error(`Reviews API HTTP ${response.status}`);
  if (text.trim().startsWith('<')) throw new Error('Reviews API returned HTML instead of JSON');
  try { return JSON.parse(text) as T; } catch { throw new Error('Сервер повернув некоректну відповідь. Оновіть список перед повторною спробою.'); }
}

export async function listSharedReviews(signal?: AbortSignal): Promise<SharedReview[]> {
  if (!API_URL) throw new Error('VITE_REVIEWS_API_URL is not configured');
  const separator = API_URL.includes('?') ? '&' : '?';
  const payload = await request<ListResponse>(`${API_URL}${separator}action=list&_=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
    signal,
  });

  if (!payload.ok || !Array.isArray(payload.reviews)) {
    throw new Error(payload.error || 'Invalid reviews list response');
  }
  return payload.reviews.map(review => ({ ...review, images: Array.isArray(review.images) ? review.images : [], tags: Array.isArray(review.tags) ? review.tags : [] }));
}

async function postReviewAction<T>(body: unknown): Promise<T> {
  if (!API_URL) throw new Error('VITE_REVIEWS_API_URL is not configured');
  return request<T>(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });

}

export async function createSharedReview(review: SharedReview): Promise<SharedReview> {
  const payload = await postReviewAction<MutationResponse>({ action: 'create', review });
  if (!payload.ok) throw new Error(payload.error || 'Reviews mutation failed');
  if (!payload.review) throw new Error('Reviews API did not return the created review');
  return payload.review;
}

export async function updateSharedReview(
  id: string,
  changes: Partial<SharedReview>,
): Promise<SharedReview> {
  const payload = await postReviewAction<MutationResponse>({ action: 'update', id, changes });
  if (!payload.ok) throw new Error(payload.error || 'Reviews mutation failed');
  if (!payload.review) throw new Error('Reviews API did not return the updated review');
  return payload.review;
}

export async function bulkUpsertSharedReviews(
  reviews: SharedReview[],
): Promise<{ created: number; updated: number }> {
  const payload = await postReviewAction<BulkResponse>({ action: 'bulkUpsert', reviews });
  if (!payload.ok) throw new Error(payload.error || 'Reviews bulk sync failed');
  return { created: Number(payload.created || 0), updated: Number(payload.updated || 0) };
}

export async function deleteSharedReview(id: string): Promise<void> {
  const payload = await postReviewAction<{ ok: boolean; deleted?: boolean; id?: string; error?: string }>({ action: 'delete', id });
  if (!payload.ok || !payload.deleted || payload.id !== id) throw new Error(payload.error || 'Сервер не підтвердив видалення. Потрібне оновлення Reviews API.');
}
