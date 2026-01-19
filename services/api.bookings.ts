// src/services/api.bookings.ts
import { ENDPOINTS } from './api.constants';
import { parseJsonSafe, normalizeApiError } from './api.helpers';
import { transformBookingInfoToBooking } from './transformers';
import type { Booking, Consent, Guest } from '../types';

/* -------------------------------------------------------------------------- */
/*                               CREATE BOOKING                                */
/* -------------------------------------------------------------------------- */
export const createBooking = async (bookingData: Booking): Promise<Booking> => {
  const res = await fetch(ENDPOINTS.CREATE_BOOKING, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData),
  });

  const data = await parseJsonSafe(res) as any;

  if (!res.ok) {
    const msg = normalizeApiError(data, `Failed to create booking (${res.status})`);
    throw new Error(msg);
  }

  return (data?.data ?? data) as Booking;
};

/* -------------------------------------------------------------------------- */
/*                             INITIATE CHECK-IN (ENHANCED)                    */
/* -------------------------------------------------------------------------- */
// src/services/api.bookings.ts
// src/services/api.bookings.ts
export const initiateCheckIn = async (bookingId: number) => {
  const payload = { bookingId };

  const res = await fetch(ENDPOINTS.CHECKIN_INITIATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // parse body defensively
  let data: any = null;
  try { data = await parseJsonSafe(res); }
  catch {
    try { const t = await res.text(); data = JSON.parse(t); } catch { data = null; }
  }

  if (res.status === 206 && data) return data?.data ?? data;

  if (res.status === 409) {
    const candidate = data?.data ?? data ?? null;

    console.warn('[api] check-in already initiated, reuse existing session', candidate);

    // ✅ ห้าม throw
    // ✅ คืน payload กลับไปให้ saveCheckIn จัดการต่อ
    return candidate;
  }


  if (!res.ok) {
    const msg = normalizeApiError(data, `Failed to initiate check-in (${res.status})`);
    const err: any = new Error(msg);
    err.status = res.status; err.data = data;
    throw err;
  }

  return data?.data ?? data;
};

/* -------------------------------------------------------------------------- */
/*                        GET BOOKING INFO BY TOKEN                            */
/* -------------------------------------------------------------------------- */
export const getBookingInfoByToken = async (token: string): Promise<any> => {
  const url = `${ENDPOINTS.BOOKING_INFO_BY_TOKEN}/${encodeURIComponent(token)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await parseJsonSafe(res) as any;

  if (!res.ok) {
    const msg = normalizeApiError(data, `Invalid or expired token (${res.status})`);
    throw new Error(msg);
  }

  return (data?.data ?? data);
};

/* -------------------------------------------------------------------------- */
/*                      VERIFY TOKEN (CLICK-LINK CHECK-IN)                    */
/* -------------------------------------------------------------------------- */
/**
 * - สร้าง verify URL แบบ robust
 * - จัดการ error code: missingToken / invalidOrExpiredToken / missingBookingIdX
 * - ทำ normalization ให้ payload
 */
export const getBookingByToken = async (
  token: string,
  bookingRoomId?: number | string | null
): Promise<any> => {
  if (!token) {
    const err: any = new Error("Token is required");
    err.code = "error.missingToken";
    throw err;
  }

  const checkinBase = ENDPOINTS.CHECKIN_INITIATE.replace(/\/initiate\/?$/i, "");
  let bookingRoomIdValue = bookingRoomId;
  if (bookingRoomIdValue === undefined || bookingRoomIdValue === null || bookingRoomIdValue === "") {
    try {
      const stored = localStorage.getItem("checkin_booking_room_id");
      if (stored && /^\d+$/.test(String(stored))) {
        bookingRoomIdValue = Number(stored);
      }
    } catch {
      // ignore
    }
  }

  const params = new URLSearchParams({ token: String(token) });
  if (bookingRoomIdValue !== undefined && bookingRoomIdValue !== null && String(bookingRoomIdValue).trim() !== "") {
    params.set("bookingRoomId", String(bookingRoomIdValue));
  }
  const verifyUrl = `${checkinBase}/verify?${params.toString()}`;

  const res = await fetch(verifyUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = (await parseJsonSafe(res)) as any;

  if (!res.ok) {
    const code = data?.error?.code ?? "";

    if (code === "error.invalidOrExpiredToken") {
      const err: any = new Error("Token invalid or expired");
      err.code = code;
      throw err;
    }
    if (code === "error.missingToken") {
      const err: any = new Error("Missing token");
      err.code = code;
      throw err;
    }

    const err: any = new Error(normalizeApiError(data, `Verify token failed (${res.status})`));
    if (code) err.code = code;
    err.status = res.status;
    err.data = data;
    throw err;
  }

  // -----------------------------
  // ✅ Normalize output
  // -----------------------------
  const payload = data?.data ?? {};
  const adults = Number(payload?.adults ?? 0);
  const children = Number(payload?.children ?? 0);

  const normalized = {
    ...payload,
    bookingRoomId: payload?.bookingRoomId ?? payload?.booking_room_id,
    bookingInfoStatus: payload?.bookingInfoStatus ?? payload?.booking_info_status,

    // ⭐ สำคัญ: App.tsx ใช้ booking.guests.adults/children
    guests: {
      adults,
      children,
    },

    adults,
    children,

    // รองรับกรณี backend ส่งเป็น null/undefined
    accompanyingGuests: Array.isArray(payload?.accompanyingGuests)
      ? payload.accompanyingGuests
      : (payload?.accompanyingGuests ?? []),

    rooms: Array.isArray(payload?.rooms) ? payload.rooms : [],
  };

  // ✅ เช็คอินแล้ว → ใส่ flag ให้ frontend ใช้ flow already_checked_in
  if (data?.status === "already_checked_in") {
    return {
      ...normalized,
      __alreadyCheckedIn: true,
    };
  }

  // ✅ เช็คอินปกติ
  if (data?.status === "success") {
    return normalized;
  }

  return normalized;
};


/* -------------------------------------------------------------------------- */
/*                     VERIFY CHECK-IN CODE (MANUAL ENTRY)                    */
/* -------------------------------------------------------------------------- */
export const verifyCheckinCode = async (payload: {
  code: string;
  lastName?: string;
  bookingNumber?: string;
}) => {
  const url = ENDPOINTS.VERIFY_CHECKIN_CODE;

  const normalize = (s: string) => (s || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const codeNormalized = normalize(payload.code);

  const bodyPayload = {
    checkinCode: codeNormalized,
    code: codeNormalized,
    rawCode: payload.code,
    query: payload.lastName ?? payload.bookingNumber ?? codeNormalized,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyPayload),
  });

  const data = await parseJsonSafe(res) as any;

  if (!res.ok) {
    const msg = normalizeApiError(data, `Verification failed (${res.status})`);
    const err: any = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data?.data ?? data;
};

/* -------------------------------------------------------------------------- */
/*                       RESEND CHECK-IN CODE (EMAIL)                         */
/* -------------------------------------------------------------------------- */
export const resendCheckinCode = async (payload: {
  bookingInfoId?: number;
  checkinCode?: string;
}) => {
  const url = ENDPOINTS.CHECKIN_RESEND;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingInfoId: payload.bookingInfoId,
      checkinCode: payload.checkinCode?.trim(),
    }),
  });

  const data = await parseJsonSafe(res) as any;

  if (!res.ok) {
    const msg = normalizeApiError(data, `Resend failed (${res.status})`);
    const err: any = new Error(msg);
    err.data = data;
    throw err;
  }

  return data?.data ?? data;
};

/* -------------------------------------------------------------------------- */
/*                        FINALIZE CHECK-IN (T4)                              */
/* -------------------------------------------------------------------------- */
export const saveCheckIn = async (payload: {
  token?: string;
  booking_id?: number;
}) => {
  /* ----- FLOW A: มี TOKEN ----- */
  if (payload.token) {
    const res = await fetch(ENDPOINTS.CHECKIN_CONFIRM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: payload.token, // ✅ ส่งแค่นี้พอ
      }),
    });

    const data = await parseJsonSafe(res) as any;
    if (!res.ok) {
      throw new Error(normalizeApiError(data, `Failed to finalize check-in (${res.status})`));
    }
    return data?.data ?? data;
  }

  /* ----- FLOW B: มี booking_id ----- */
  if (payload.booking_id) {
    const init = await initiateCheckIn(payload.booking_id);

    const token =
      init?.token ??
      init?.checkin_code ??
      init?.checkinCode ??
      init?.data?.token ??
      init?.data?.checkin_code ??
      null;

    if (!token) {
      console.error('[checkin] initiateCheckIn returned no token', init);
      throw new Error("Failed to obtain token from initiateCheckIn");
    }

    const res = await fetch(ENDPOINTS.CHECKIN_CONFIRM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,

      }),
    });

    const data = await parseJsonSafe(res) as any;
    if (!res.ok) throw new Error(normalizeApiError(data, `Failed to finalize check-in (${res.status})`));
    return data?.data ?? data;
  }

  throw new Error("saveCheckIn requires either token or booking_id");
};

/* -------------------------------------------------------------------------- */
/*                                   ROOMS                                    */
/* -------------------------------------------------------------------------- */
export const fetchAllRooms = async (): Promise<any[]> => {
  const res = await fetch(ENDPOINTS.ROOMS, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await parseJsonSafe(res) as any;

  if (!res.ok) {
    const msg = normalizeApiError(data, `Failed to fetch rooms (${res.status})`);
    throw new Error(msg);
  }

  return data?.data ?? data;
};
export const getBookingDetailsById = async (bookingId: number) => {
  const res = await fetch(`${ENDPOINTS.BOOKINGS}/${bookingId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      normalizeApiError(data, `Failed to fetch booking (${res.status})`)
    );
  }

  return data?.data ?? data;
};

/* -------------------------------------------------------------------------- */
/*                            GET BOOKING DETAILS                              */
/* -------------------------------------------------------------------------- */
export const getBookingDetails = async (): Promise<any> => {
  const res = await fetch(ENDPOINTS.BOOKINGS, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await parseJsonSafe(res) as any;

  if (!res.ok) {
    const msg = normalizeApiError(data, `Failed to fetch booking details (${res.status})`);
    throw new Error(msg);
  }

  return {
    id: data?.ID ?? data?.id,
    stay: {
      from: data?.checkIn,
      to: data?.checkOut,
    },
    room: {
      type: data?.Room?.type,
      roomNumber: data?.Room?.roomNumber,
    },
    mainGuest: data?.Customer?.fullName,
    email: data?.Customer?.email,
  };
};
/* -------------------------------------------------------------------------- */
/*                                CHECKOUT BOOKING                             */
/* -------------------------------------------------------------------------- */
// src/services/api.bookings.ts

export const checkoutBooking = async (bookingId: number) => {
  const res = await fetch(
    `${ENDPOINTS.BOOKINGS}/${bookingId}/checkout`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Checkout failed (${res.status}): ${text}`);
  }

  return res.json();
};

