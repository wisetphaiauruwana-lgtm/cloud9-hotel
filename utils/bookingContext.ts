// src/utils/bookingContext.ts

/**
 * BookingContext
 * ใช้เป็น identifier กลางสำหรับทุกหน้าที่ต้องอ้างอิง booking
 * - ถ้ามี bookingId → ใช้ bookingId
 * - ถ้าไม่มี bookingId → ใช้ bookingToken
 * - ถ้าไม่มีทั้งคู่ → throw error
 */

export type BookingContext =
  | { bookingId: number }
  | { bookingToken: string };

/**
 * สร้าง booking context ที่ "ถูกต้องเพียงหนึ่งค่า"
 */
export function buildBookingContext(input: {
  bookingId?: number | string | null;
  token?: string | null;
}): BookingContext {
  // 1️⃣ bookingId มาก่อนเสมอ
  if (input.bookingId !== undefined && input.bookingId !== null) {
    const n = Number(input.bookingId);
    if (!Number.isNaN(n) && n > 0) {
      return { bookingId: n };
    }
  }

  // 2️⃣ ถ้าไม่มี bookingId ใช้ token
  if (input.token && typeof input.token === "string") {
    const t = input.token.trim();
    if (t !== "" && !/^\d+$/.test(t)) {
      return { bookingToken: t };
    }
  }

  // 3️⃣ ไม่ผ่าน = ผิด
  throw new Error(
    "Missing or invalid booking identifier (bookingId or bookingToken)"
  );
}

/**
 * helper สำหรับเช็กว่า context เป็น bookingId หรือไม่
 */
export function isBookingId(
  ctx: BookingContext
): ctx is { bookingId: number } {
  return "bookingId" in ctx;
}

/**
 * helper สำหรับเช็กว่า context เป็น bookingToken หรือไม่
 */
export function isBookingToken(
  ctx: BookingContext
): ctx is { bookingToken: string } {
  return "bookingToken" in ctx;
}

/**
 * helper แปลง context เป็น payload สำหรับ API
 * (ใช้กระจายค่าเข้า payload ได้ง่าย)
 */
export function bookingContextToPayload(
  ctx: BookingContext
): { bookingId?: number; bookingToken?: string } {
  if ("bookingId" in ctx) {
    return { bookingId: ctx.bookingId };
  }
  return { bookingToken: ctx.bookingToken };
}
