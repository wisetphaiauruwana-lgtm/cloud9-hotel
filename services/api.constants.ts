// src/services/api.constants.ts

const rawApiBase =
  (import.meta.env.VITE_API_BASE as string) ||
  'https://hotel-backend-production-5d4b.up.railway.app';

export const API_BASE_URL: string = rawApiBase.replace(/\/+$/, '');

export const ENDPOINTS = {
  CREATE_CUSTOMER: `${API_BASE_URL}/api/customers`,
  CREATE_BOOKING: `${API_BASE_URL}/api/bookings`,
  CHECKIN_INITIATE: `${API_BASE_URL}/api/checkin/initiate`,
  CHECKIN_CONFIRM: `${API_BASE_URL}/api/checkin`,

  // -----------------------------
  // CONSENT ENDPOINTS
  // -----------------------------
  CONSENTS: `${API_BASE_URL}/api/consents`,

  // ⭐⭐ REQUIRED — endpoint ใหม่ที่ backend รองรับแล้ว ⭐⭐
  CONSENTS_ACCEPT: `${API_BASE_URL}/api/consents/accept`,

  CONSENT_LOGS: `${API_BASE_URL}/api/consent-logs`,
  ATTACH_CONSENT_LOGS: `${API_BASE_URL}/api/consent-logs/attach-booking`,

  // -----------------------------
  // GUESTS
  // -----------------------------
  GUESTS: `${API_BASE_URL}/api/guests`,

  // -----------------------------
  // VERIFY DOCUMENTS
  // -----------------------------
  VERIFY_IDCARD: `${API_BASE_URL}/api/verify/idcard`,
  VERIFY_PASSPORT: `${API_BASE_URL}/api/verify/passport`,

  // -----------------------------
  // BOOKING INFO
  // -----------------------------
  BOOKING_INFO_BY_TOKEN: `${API_BASE_URL}/api/booking-info/token`,
  VERIFY_CHECKIN_CODE: `${API_BASE_URL}/api/checkin/validate`,
  CHECKIN_RESEND: `${API_BASE_URL}/api/checkin/resend`,

  // -----------------------------
  // ROOMS & BOOKINGS
  // -----------------------------
  ROOMS: `${API_BASE_URL}/api/rooms`,
  BOOKINGS: `${API_BASE_URL}/api/bookings`,
 

};
