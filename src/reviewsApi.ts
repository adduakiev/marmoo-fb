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

const API_URL = String(import.meta.env.VITE_REVIEWS_API_URL || '').trim();

export const hasSharedReviewsApi = Boolean(API_URL);

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) throw new Error(`Reviews API HTTP ${response.status}`);
  if (text.trim().startsWith('<')) throw new Error('Reviews API returned HTML instead of JSON');
  const payload = JSON.parse(text) as T;
  return payload;
}

export async function listSharedReviews(signal?: AbortSignal): Promise<SharedReview[]> {
  if (!API_URL) throw new Error('VITE_REVIEWS_API_URL is not configured');
  const separator = API_URL.includes('?') ? '&' : '?';
  const response = await fetch(`${API_URL}${separator}action=list&_=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
    signal,
  });
  const payload = await parseResponse<ListResponse>(response);
  if (!payload.ok || !Array.isArray(payload.reviews)) throw new Error(payload.error || 'Invalid reviews list response');
  return payload.reviews;
}

async function postReviewAction(body: unknown): Promise<MutationResponse> {
  if (!API_URL) throw new Error('VITE_REVIEWS_API_URL is not configured');
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  const payload = await parseResponse<MutationResponse>(response);
  if (!payload.ok) throw new Error(payload.error || 'Reviews mutation failed');
  return payload;
}

export async function createSharedReview(review: SharedReview): Promise<SharedReview> {
  const payload = await postReviewAction({ action: 'create', review });
  if (!payload.review) throw new Error('Reviews API did not return the created review');
  return payload.review;
}

export async function updateSharedReview(id: string, changes: Partial<SharedReview>): Promise<SharedReview> {
  const payload = await postReviewAction({ action: 'update', id, changes });
  if (!payload.review) throw new Error('Reviews API did not return the updated review');
  return payload.review;
}
