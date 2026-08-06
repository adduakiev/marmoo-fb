const REVIEWS_SPREADSHEET_ID = '1cNz3RNkFrGeCQHdFfbXmWdpY37Y9b7j3kL7vmQpkWpg';
const REVIEWS_SHEET_NAME = 'Reviews';

const REVIEW_HEADERS = [
  'Review date', 'Review URL', 'Author name', 'Author URL', 'Local Guide',
  'Author reviews', 'Star rating', 'Review content', 'Review image', 'Review video',
  'ID', 'Source', 'Status', 'Reply', 'Assignee', 'Internal Note',
  'Responded At', 'Created At', 'Updated At', 'Tags'
];

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'list');
    if (action === 'health') return json_({ ok: true, service: 'marmoo-reviews-api' });
    if (action === 'list') return json_(listReviews_());
    return json_({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  try {
    const payload = parseBody_(e);
    const action = String(payload.action || '');
    if (action === 'create') return json_(createReview_(payload.review || {}));
    if (action === 'update') return json_(updateReview_(payload.id, payload.changes || {}));
    if (action === 'bulkUpsert') return json_(bulkUpsert_(payload.reviews || []));
    return json_({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function listReviews_() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return { ok: true, reviews: [], updatedAt: new Date().toISOString() };
  const headers = values[0];
  const rows = values.slice(1).filter(row => row.some(Boolean));
  const reviews = rows.map(row => rowToReview_(headers, row));
  return { ok: true, reviews, updatedAt: new Date().toISOString() };
}

function createReview_(review) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getSheet_();
    const now = new Date().toISOString();
    const id = String(review.id || ('manual-' + Utilities.getUuid()));
    const normalized = normalizeReview_({
      ...review,
      id,
      createdAt: review.createdAt || now,
      updatedAt: now
    });
    const existing = findRowById_(sheet, id);
    if (existing > 0) return { ok: false, error: 'Review already exists', id };
    sheet.appendRow(reviewToRow_(normalized));
    return { ok: true, review: normalized };
  } finally {
    lock.releaseLock();
  }
}

function updateReview_(id, changes) {
  if (!id) throw new Error('Missing review id');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getSheet_();
    const rowIndex = findRowById_(sheet, String(id));
    if (rowIndex < 2) return { ok: false, error: 'Review not found', id };
    const currentRow = sheet.getRange(rowIndex, 1, 1, REVIEW_HEADERS.length).getDisplayValues()[0];
    const current = rowToReview_(REVIEW_HEADERS, currentRow);
    const next = normalizeReview_({ ...current, ...changes, id: current.id, updatedAt: new Date().toISOString() });
    sheet.getRange(rowIndex, 1, 1, REVIEW_HEADERS.length).setValues([reviewToRow_(next)]);
    return { ok: true, review: next };
  } finally {
    lock.releaseLock();
  }
}

function bulkUpsert_(reviews) {
  if (!Array.isArray(reviews)) throw new Error('reviews must be an array');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getDisplayValues();
    const idIndex = REVIEW_HEADERS.indexOf('ID');
    const existing = new Map();
    values.slice(1).forEach((row, index) => {
      const id = String(row[idIndex] || '').trim();
      if (id) existing.set(id, index + 2);
    });
    let created = 0;
    let updated = 0;
    reviews.forEach(item => {
      const now = new Date().toISOString();
      const id = String(item.id || item.url || ('manual-' + Utilities.getUuid()));
      const normalized = normalizeReview_({ ...item, id, updatedAt: now, createdAt: item.createdAt || now });
      const row = reviewToRow_(normalized);
      if (existing.has(id)) {
        sheet.getRange(existing.get(id), 1, 1, REVIEW_HEADERS.length).setValues([row]);
        updated += 1;
      } else {
        sheet.appendRow(row);
        existing.set(id, sheet.getLastRow());
        created += 1;
      }
    });
    return { ok: true, created, updated };
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(REVIEWS_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(REVIEWS_SHEET_NAME);
  if (!sheet) throw new Error('Sheet "Reviews" not found');
  const headers = sheet.getRange(1, 1, 1, REVIEW_HEADERS.length).getDisplayValues()[0];
  if (headers.join('|') !== REVIEW_HEADERS.join('|')) throw new Error('Reviews headers do not match API schema');
  return sheet;
}

function findRowById_(sheet, id) {
  const idColumn = REVIEW_HEADERS.indexOf('ID') + 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const values = sheet.getRange(2, idColumn, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0]).trim() === id) return i + 2;
  }
  return -1;
}

function rowToReview_(headers, row) {
  const obj = {};
  headers.forEach((header, index) => { obj[header] = row[index] || ''; });
  return normalizeReview_({
    date: obj['Review date'],
    url: obj['Review URL'],
    author: obj['Author name'],
    authorUrl: obj['Author URL'],
    localGuide: String(obj['Local Guide']).toLowerCase() === 'true',
    authorReviews: Number(obj['Author reviews']) || 0,
    rating: obj['Star rating'] === '' ? null : Number(obj['Star rating']),
    content: obj['Review content'],
    images: String(obj['Review image'] || '').split(',').map(v => v.trim()).filter(Boolean),
    video: obj['Review video'] || null,
    id: obj['ID'] || obj['Review URL'],
    source: obj['Source'] || 'Google',
    status: obj['Status'] || 'needs_reply',
    reply: obj['Reply'] || '',
    assignee: obj['Assignee'] || '',
    internalNote: obj['Internal Note'] || '',
    respondedAt: obj['Responded At'] || '',
    createdAt: obj['Created At'] || '',
    updatedAt: obj['Updated At'] || '',
    tags: String(obj['Tags'] || '').split(',').map(v => v.trim()).filter(Boolean)
  });
}

function reviewToRow_(review) {
  const r = normalizeReview_(review);
  return [
    r.date, r.url, r.author, r.authorUrl, r.localGuide, r.authorReviews,
    r.rating === null ? '' : r.rating, r.content, r.images.join(', '), r.video || '',
    r.id, r.source, r.status, r.reply, r.assignee, r.internalNote,
    r.respondedAt, r.createdAt, r.updatedAt, r.tags.join(', ')
  ];
}

function normalizeReview_(review) {
  const allowedStatuses = ['new', 'needs_reply', 'draft', 'sent', 'closed'];
  return {
    id: String(review.id || review.url || ''),
    source: String(review.source || 'Google'),
    date: String(review.date || ''),
    url: String(review.url || ''),
    author: String(review.author || 'Без імені'),
    authorUrl: String(review.authorUrl || ''),
    localGuide: Boolean(review.localGuide),
    authorReviews: Number(review.authorReviews) || 0,
    rating: review.rating === null || review.rating === '' || typeof review.rating === 'undefined' ? null : Number(review.rating),
    content: String(review.content || ''),
    images: Array.isArray(review.images) ? review.images.map(String) : [],
    video: review.video ? String(review.video) : null,
    status: allowedStatuses.includes(String(review.status)) ? String(review.status) : 'needs_reply',
    reply: String(review.reply || ''),
    internalNote: String(review.internalNote || ''),
    assignee: String(review.assignee || ''),
    respondedAt: String(review.respondedAt || ''),
    createdAt: String(review.createdAt || ''),
    updatedAt: String(review.updatedAt || ''),
    tags: Array.isArray(review.tags) ? review.tags.map(String) : []
  };
}

function parseBody_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  return JSON.parse(raw);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
