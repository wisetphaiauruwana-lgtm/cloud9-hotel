// src/services/api.consents.ts
import { ENDPOINTS } from './api.constants';
import {
  parseJsonSafe,
  normalizeApiError,
  slugify,
  tryParseNumberOrString,
} from './api.helpers';

/* -------------------------------------------------------------------------- */
/*                               CREATE CONSENT                               */
/* -------------------------------------------------------------------------- */
export const createConsent = async (payload: {
  guestId?: number | string;
  type?: string;
  accepted?: boolean;
  bookingId?: number | string;
  title?: string;
  slug?: string;
  description?: string;
  version?: string;
}) => {
  const typeName = (payload.type || 'consent').toString();
  const providedTitle = payload.title?.toString().trim();
  const defaultTitle =
    providedTitle && providedTitle.length > 0
      ? providedTitle
      : typeName.replace(/[_-]/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());

  const providedSlug = payload.slug?.toString().trim();
  const defaultSlug =
    providedSlug && providedSlug.length > 0
      ? providedSlug
      : slugify(defaultTitle);

  const body: any = {
    title: defaultTitle,
    slug: defaultSlug,
    description: payload.description ?? `${defaultTitle} (auto-generated)`,
    version: payload.version ?? '1.0',
    guestId: payload.guestId,
    accepted: payload.accepted,
    type: payload.type,
  };

  if (payload.bookingId !== undefined) {
    const v = tryParseNumberOrString(payload.bookingId);
    if (typeof v === 'number') {
      body.bookingId = v;
    } else if (typeof v === 'string') {
      body.booking_token = v;
    }
  }

  Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

  const res = await fetch(ENDPOINTS.CONSENTS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    // 🔴 CREATE CONSENT ไม่มี pending → throw ปกติ
    throw new Error(normalizeApiError(data, 'Failed to create consent'));
  }

  return data?.data ?? data;
};

/* -------------------------------------------------------------------------- */
/*                              ACCEPT CONSENT                                 */
/* -------------------------------------------------------------------------- */
export const acceptConsent = async (payload: {
  guestId: number;
  bookingId?: number | string;
  consentId: number;
  action?: string;
}) => {
  const body: any = {
    guestId: payload.guestId,
    consentId: payload.consentId,
    action: payload.action ?? 'accepted',
  };

  if (payload.bookingId !== undefined) {
    const v = tryParseNumberOrString(payload.bookingId);
    if (typeof v === 'number') body.bookingId = v;
    else if (typeof v === 'string') body.bookingId = v;
  }

  const res = await fetch(ENDPOINTS.CONSENTS_ACCEPT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const code = data?.error?.code;
    if (code === 'error.missingBookingIdX') {
      // ✅ pending consent → ถือว่าสำเร็จ
      return data;
    }
    throw new Error(normalizeApiError(data, 'Failed to accept consent'));
  }

  return data?.data ?? data;
};

/* -------------------------------------------------------------------------- */
/*                           CREATE CONSENT LOG                                */
/* -------------------------------------------------------------------------- */
export const createConsentLog = async (payload: {
  bookingId?: number | string;
  consentId: number | string;
  guestId: number | string;
  action?: string;
  acceptedAt?: string;
  acceptedBy?: string;
}) => {
  const body: any = {
    consentId: tryParseNumberOrString(payload.consentId),
    guestId: tryParseNumberOrString(payload.guestId),
    action: payload.action ?? 'accepted',
    accepted_at: payload.acceptedAt ?? new Date().toISOString(),
    accepted_by: payload.acceptedBy,
  };

  if (payload.bookingId !== undefined) {
    const v = tryParseNumberOrString(payload.bookingId);
    if (typeof v === 'number') body.bookingId = v;
    else if (typeof v === 'string') body.booking_token = v;
  }

  Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

  const res = await fetch(ENDPOINTS.CONSENT_LOGS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const code = data?.error?.code;
    if (code === 'error.missingBookingIdX') {
      // ✅ pending log → ไม่ throw
      return data;
    }
    throw new Error(normalizeApiError(data, 'Failed to create consent log'));
  }

  return data?.data ?? data;
};

/* -------------------------------------------------------------------------- */
/*                        ATTACH CONSENT LOGS                                  */
/* -------------------------------------------------------------------------- */
export const attachConsentLogs = async (payload: {
  bookingId: number | string;
  guestIds?: Array<number | string>;
  guestId?: number | string;
}) => {
  const body: any = {
    bookingId: tryParseNumberOrString(payload.bookingId),
  };

  if (Array.isArray(payload.guestIds) && payload.guestIds.length > 0) {
    body.guestIds = payload.guestIds.map(g => tryParseNumberOrString(g));
  } else if (payload.guestId !== undefined) {
    body.guestId = tryParseNumberOrString(payload.guestId);
  } else {
    throw new Error('attachConsentLogs requires guestIds or guestId');
  }

  const res = await fetch(ENDPOINTS.ATTACH_CONSENT_LOGS, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const code = data?.error?.code;
    if (code === 'error.missingBookingIdX') {
      // ✅ ยังไม่มี booking → ไม่ต้อง attach
      return data;
    }
    throw new Error(normalizeApiError(data, 'Failed to attach consent logs'));
  }

  return data?.data ?? data;
};
