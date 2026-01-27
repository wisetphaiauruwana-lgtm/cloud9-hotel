// src/utils/guestCache.ts
import { Guest } from "../types";

const GUEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 ชม.
const guestCacheKey = (bookingId: number, bookingRoomId?: number | string | null) => {
  if (bookingRoomId !== undefined && bookingRoomId !== null && String(bookingRoomId).trim() !== "") {
    return `guest_cache_${bookingId}_${bookingRoomId}`;
  }
  return `guest_cache_${bookingId}`;
};

/* -------------------------------------------------------------------------- */
/*                                   CACHE                                    */
/* -------------------------------------------------------------------------- */
export const saveGuestCache = (bookingId: number, guests: Guest[], bookingRoomId?: number | string | null) => {
  try {
    const payload = {
      __ts: Date.now(),
      guests: (guests || []).map((g) => ({
        id: g.id,
        name: g.name,
        isMainGuest: !!g.isMainGuest,
        documentType: g.documentType,
        progress: g.progress ?? 0,
        details: g.details ?? {},
        faceImage: g.faceImage ?? "",
        documentImage: g.documentImage ?? "",
        bookingRoomId: g.bookingRoomId,
      })),
    };
    localStorage.setItem(guestCacheKey(bookingId, bookingRoomId), JSON.stringify(payload));
    // debug log removed
  } catch (e) {
    console.warn("[guest-cache] save failed", e);
  }
};

export const loadGuestCache = (bookingId: number, bookingRoomId?: number | string | null): Guest[] => {
  try {
    const raw = localStorage.getItem(guestCacheKey(bookingId, bookingRoomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.__ts ?? 0);
    const isCacheValid = ts && Date.now() - ts < GUEST_CACHE_TTL_MS;
    if (!isCacheValid) {
      localStorage.removeItem(guestCacheKey(bookingId, bookingRoomId));  // ลบ cache ที่หมดอายุ
      return [];
    }
    // debug log removed
    return Array.isArray(parsed?.guests) ? parsed.guests : [];
  } catch (e) {
    console.error('[guest-cache] load failed', e);
    return [];
  }
};

/* -------------------------------------------------------------------------- */
/*                             MERGE (CACHE WINS)                             */
/* -------------------------------------------------------------------------- */
const guestKeyStable = (g: any) => {
  const doc = String(g?.details?.documentNumber ?? g?.id_number ?? "").trim();
  const fn = String(g?.details?.firstName ?? g?.first_name ?? g?.firstName ?? "").trim();
  const ln = String(g?.details?.lastName ?? g?.last_name ?? g?.lastName ?? "").trim();
  const dob = String(g?.details?.dateOfBirth ?? g?.date_of_birth ?? g?.dateOfBirth ?? "").trim();
  const name = String(g?.name ?? g?.full_name ?? g?.fullName ?? "").trim();

  if (doc) return `DOC:${doc}`;
  if ((fn || ln) && dob) return `NDO:${fn}|${ln}|${dob}`;
  if (name) return `NAME:${name}`;
  return `ID:${String(g?.id ?? "")}`;
};

// ✅ merge: cache ชนะ backend เสมอ
export const mergeGuestsPreferCache = (backendList: any[], cacheList: any[]) => {
  const map = new Map<string, any>();

  for (const g of backendList || []) {
    map.set(guestKeyStable(g), g);
  }

  for (const c of cacheList || []) {
    const k = guestKeyStable(c);
    const prev = map.get(k) || {};
    map.set(k, {
      ...prev,
      ...c,
      details: { ...(prev.details || {}), ...(c.details || {}) },
      name: c.name ?? prev.name,
      documentType: c.documentType ?? prev.documentType,
      faceImage: c.faceImage ?? prev.faceImage,
      documentImage: c.documentImage ?? prev.documentImage,
      isMainGuest: typeof c.isMainGuest === "boolean" ? c.isMainGuest : prev.isMainGuest,
      progress: typeof c.progress === "number" ? c.progress : prev.progress,
    });
  }

  const out = Array.from(map.values());
  out.sort(
    (a, b) =>
      Number(!!(b.isMainGuest ?? b.is_main_guest ?? b.mainGuest)) -
      Number(!!(a.isMainGuest ?? a.is_main_guest ?? a.mainGuest))
  );
  return out;
};

/* -------------------------------------------------------------------------- */
/*                       NORMALIZE (DEDUP + PICK BEST)                         */
/* -------------------------------------------------------------------------- */
/**
 * ✅ FIX สำคัญ: กันซ้ำแบบในรูป (ชื่อเดียวกัน 0% + 100%)
 * สาเหตุ: คนหนึ่ง key เป็น NAME:..., อีกคนเป็น DOC:...
 * วิธีแก้: ทำ nameIndex ให้ "ชื่อ" ชี้ไปยัง bucket เดียวกันเสมอ
 */
export const normalizeGuestsForDisplay = (list: Guest[]) => {
  const buckets = new Map<string, Guest>();
  const nameIndex = new Map<string, string>();

  const normName = (s?: string) =>
    String(s ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const makePrimaryKey = (g: Guest) => {
    const doc = String(g.details?.documentNumber ?? "").trim();
    const fn = String(g.details?.firstName ?? "").trim();
    const ln = String(g.details?.lastName ?? "").trim();
    const dob = String(g.details?.dateOfBirth ?? "").trim();
    const name = normName(g.name);

    if (doc) return `DOC:${doc}`;
    if ((fn || ln) && dob) return `NDO:${normName(fn)}|${normName(ln)}|${dob}`;
    if (name) return `NAME:${name}`;
    return `FALLBACK:${String(g.id ?? "")}`;
  };
const score = (g: Guest) => {
  const fn = String(g.details?.firstName ?? "").trim();
  const ln = String(g.details?.lastName ?? "").trim();
  const doc = String(g.details?.documentNumber ?? "").trim();
  const nat = String(g.details?.nationality ?? "").trim();
  const gender = String(g.details?.gender ?? "").trim();
  const dob = String(g.details?.dateOfBirth ?? "").trim();
  const addr = String((g.details as any)?.currentAddress ?? "").trim();
  const doa = String((g.details as any)?.dateOfArrival ?? "").trim();
  const visa = String((g.details as any)?.visaType ?? "").trim();
  const stayExp = String((g.details as any)?.stayExpiryDate ?? "").trim();
  const poe = String((g.details as any)?.pointOfEntry ?? "").trim();
  const tm = String((g.details as any)?.tmCardNumber ?? "").trim();

  const hasFace = g.faceImage ? 1 : 0;
  const hasDocImg = g.documentImage ? 1 : 0;

  return (
    (fn ? 2 : 0) +
    (ln ? 2 : 0) +
    (doc ? 3 : 0) + // ให้ doc สำคัญขึ้น (กัน placeholder ชนะ)
    (dob ? 1 : 0) +
    (nat ? 1 : 0) +
    (gender ? 1 : 0) +
    (addr ? 1 : 0) +
    (doa ? 1 : 0) +
    (visa ? 1 : 0) +
    (stayExp ? 1 : 0) +
    (poe ? 1 : 0) +
    (tm ? 1 : 0) +
    hasFace +
    hasDocImg +
    (g.progress ?? 0)
  );
};

const chooseBetter = (prev: Guest, cur: Guest) => {
  // main guest สำคัญกว่า
  if (!prev.isMainGuest && cur.isMainGuest) return cur;
  if (prev.isMainGuest && !cur.isMainGuest) return prev;

  // เลือกตัวที่ข้อมูลครบกว่า
  return score(cur) > score(prev) ? cur : prev;
};


  for (const g of list || []) {
    const primaryKey = makePrimaryKey(g);
    const nKey = normName(g.name);
    const aliasKey = nKey ? nameIndex.get(nKey) : undefined;

    // ถ้า "ชื่อนี้" เคยเจอแล้ว -> บังคับรวมเข้าบัคเก็ตเดิม
    const finalKey = aliasKey ?? primaryKey;

    const prev = buckets.get(finalKey);
    if (!prev) {
      buckets.set(finalKey, g);
      if (nKey) nameIndex.set(nKey, finalKey);
      continue;
    }

    const picked = chooseBetter(prev, g);
    buckets.set(finalKey, picked);

    if (nKey) nameIndex.set(nKey, finalKey);
  }

  const result = Array.from(buckets.values());
  result.sort((a, b) => Number(!!b.isMainGuest) - Number(!!a.isMainGuest));
  return result;
};
