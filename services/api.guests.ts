// src/services/api.guests.ts

import { ENDPOINTS } from "./api.constants";
import {
  parseJsonSafe,
  normalizeApiError,
  normalizeDateString,
} from "./api.helpers";

import { DocumentType } from "../types"; // value (enum)
import type { Guest } from "../types";  // type-only

const looksLikeToken = (val?: any) =>
  typeof val === "string" && !!val && !/^\d+$/.test(val);

/* -------------------------------------------------------------------------- */
/*                                 FETCH GUESTS                               */
/* -------------------------------------------------------------------------- */
/**
 * ✅ Policy: NEVER call /api/guests without bookingId (it may return all guests => data mixing)
 * ✅ Primary source: /api/bookings/:id/guests
 * ✅ Token input: resolve token -> bookingId first, then call /bookings/:id/guests
 */
export const fetchGuests = async (
  bookingId?: number | string
): Promise<Guest[]> => {
  const raw =
    bookingId !== undefined && bookingId !== null
      ? String(bookingId).trim()
      : "";

  // ✅ 0) no bookingId -> don't fetch anything (avoid mixing all guests)
  if (!raw) return [];

  /* ---------------------- TOKEN FLOW (VERIFY) ---------------------- */
  if (looksLikeToken(raw)) {
    try {
      const bookingModule = await import("./api.bookings");
      const booking = await bookingModule.getBookingByToken(raw);

      const resolvedId =
        booking?.bookingId ??
        booking?.data?.bookingId ??
        booking?.id ??
        booking?.data?.id;

      const resolvedStr =
        resolvedId !== undefined && resolvedId !== null
          ? String(resolvedId).trim()
          : "";

      // ✅ token must resolve into numeric bookingId
      if (resolvedStr && /^\d+$/.test(resolvedStr)) {
        return await fetchGuests(Number(resolvedStr));
      }

      return [];
    } catch (e: any) {
      // pending booking -> do not throw
      if (e?.code === "error.missingBookingIdX") return [];
      console.warn("[api] fetchGuests token flow failed", e);
      return [];
    }
  }

  /* ---------------------- NUMERIC bookingId FLOW ---------------------- */
  if (/^\d+$/.test(raw)) {
    const id = encodeURIComponent(raw);

    // ✅ 1) PRIMARY: /api/bookings/:id/guests
    try {
      // IMPORTANT: ENDPOINTS.BOOKINGS must exist
      const url = `${ENDPOINTS.BOOKINGS}/${id}/guests`;

      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await parseJsonSafe(res);

      if (res.ok) {
        return (data?.data ?? data) as Guest[];
      }

      if (res.status === 404) return [];

      throw new Error(
        normalizeApiError(data, `Failed to fetch guests (${res.status})`)
      );
    } catch (e) {
      console.warn("[api] fetchGuests /bookings/:id/guests failed", e);
      return [];
    }
  }

  // ✅ 2) unknown format -> do nothing
  return [];
};

/* -------------------------------------------------------------------------- */
/*                                 CREATE GUEST                               */
/* -------------------------------------------------------------------------- */
export const createGuest = async (payload: {
  bookingId?: number | string;
  bookingToken?: string;
  booking_token?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  documentNumber?: string;
  documentType?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  faceImageBase64?: string;
  documentImageBase64?: string;
  currentAddress?: string;
  isMainGuest?: boolean;
  email?: string; // รับ email
}) => {
  const body: any = { ...payload };
  /* ---------------------- bookingId / token ---------------------- */
  if (payload.bookingId !== undefined && payload.bookingId !== null) {
    const s = String(payload.bookingId).trim();
    if (/^\d+$/.test(s)) {
      body.bookingId = Number(s);
    } else if (s) {
      body.booking_token = s;
    }
  }

  // ตรวจสอบว่า email ถูกส่งมาด้วยหรือไม่
    if (body.email !== undefined) {
    body.email = body.email;  // เก็บอีเมลใน body
  }


  // ฟังก์ชันการแปลงฟิลด์อื่นๆ (เช่น firstName, lastName)
  if (body.firstName !== undefined) body.first_name = body.firstName;
  if (body.lastName !== undefined) body.last_name = body.lastName;
  if (body.fullName !== undefined) body.full_name = body.fullName;

  if (body.documentNumber !== undefined) {
    body.document_number = body.documentNumber;
    body.id_number = body.documentNumber;
  }

  if (body.documentType !== undefined) {
    body.document_type = body.documentType;
    body.id_type = body.documentType;
  }

  if (body.faceImageBase64 !== undefined)
    body.face_image_base64 = body.faceImageBase64;

  if (body.documentImageBase64 !== undefined)
    body.document_image_base64 = body.documentImageBase64;

  if (body.currentAddress !== undefined)
    body.current_address = body.currentAddress;

  if (body.isMainGuest !== undefined)
    body.is_main_guest = body.isMainGuest;

  if (body.dateOfBirth !== undefined) {
    const d = normalizeDateString(body.dateOfBirth);
    if (d) body.date_of_birth = d;
  }

  // ลบฟิลด์ที่ว่างออก
  Object.keys(body).forEach((k) => {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      delete body[k];
    }
  });

  /* ---------------------- API CALL ---------------------- */
  const res = await fetch(ENDPOINTS.GUESTS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const code = data?.error?.code;
    if (code === "error.missingBookingIdX") {
      // ✅ pending guest → return server response
      console.warn("[api] createGuest pending booking");
      return data;
    }

    throw new Error(
      normalizeApiError(data, `Failed to create guest (${res.status})`)
    );
  }

  const result = data?.data ?? data;

  const id =
    result?.id ?? result?.ID ?? result?.guestId ?? result?.guest_id;

  if (!id) {
    console.warn("[api] createGuest: no id returned", result);
    return result;
  }

  return {
    ...result,
    id: Number(id),
  };
};


/* -------------------------------------------------------------------------- */
/*                            OPTIONAL: HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Optional helper: build empty guest template (if you ever need local fallback)
 * Not used by fetchGuests anymore (because it causes data mismatch by guessing).
 */
export const buildEmptyGuest = (name: string, isMainGuest: boolean): Guest =>
  ({
    id: `guest_${Date.now()}`,
    name,
    isMainGuest,
    progress: 0,
    faceImage: null as any,
    documentImage: null as any,
    details: {
      firstName: "",
      lastName: "",
      documentNumber: "",
      nationality: "",
      gender: "",
      dateOfBirth: "",
      currentAddress: "",
    },
    documentType: DocumentType.IDCard,
  } as Guest);

