// src/types.ts

// ============================
// 1) SCREEN ENUM
// ============================
export enum Screen {
  Welcome = 'WELCOME',
  EnterCode = 'ENTER_CODE',
  ReservationDetails = 'RESERVATION_DETAILS',
  GuestList = 'GUEST_LIST',
  FaceCapture = 'FACE_CAPTURE',
  DocumentType = 'DOCUMENT_TYPE',
  DocumentCapture = 'DOCUMENT_CAPTURE',
  ReviewReservation = 'REVIEW_RESERVATION',
  CheckinComplete = 'CHECKIN_COMPLETE',
  PostCheckinDetails = 'POST_CHECKIN_DETAILS',
  Checkout = 'CHECKOUT',
  PrivacyPolicy = 'PRIVACY_POLICY',
  RoomAccessInformation = 'ROOM_ACCESS_INFORMATION',
  CheckoutSuccess = 'CHECKOUT_SUCCESS',
  ExtendStay = 'EXTEND_STAY',
}

// ============================
// 2) DOCUMENT TYPE ENUM
// ============================
export enum DocumentType {
  IDCard = 'Thai ID Card',
  Passport = 'Overseas Passport',

  // backend-friendly aliases
  ID = 'idcard',
  PP = 'passport',
}

// ============================
// 3) BOOKING ROOM (SOURCE OF TRUTH)
// ============================
// ============================
// 3) BOOKING ROOM (SOURCE OF TRUTH)
// ============================
export interface BookingRoom {
  id?: number;

  // ✅ เก็บ nights ที่เดียว
  nights?: number;

  // ⭐⭐ เพิ่มตรงนี้
  charges?: number;     // ← ใช้คิดเงิน
  hours?: number;       // ← (optional เผื่อ hourly stay)

  room?: {
    id?: number;
    roomNumber?: string;
    roomCode?: string;
    type?: string;

    // ⭐⭐ เพิ่มตรงนี้
    hourlyRate?: number;
  };

  // fallback กรณี backend flatten
  roomNumber?: string;
}


// ============================
// 4) BOOKING (SINGLE, CLEAN)
// ============================
export interface Booking {
  // IDs
  id?: number | string;
  dbId?: number;

  // Stay (UI helper / derived)
  stay?: {
    from?: string | null;
    to?: string | null;
    hours?: number | null;
    // ❌ nights ไม่อยู่ตรงนี้
  };

  // Rooms (ของจริง)
  rooms?: BookingRoom[];

  // Legacy single-room fallback (optional)
  room?: {
    roomNumber?: string;
    type?: string;
    floor?: string;
  };

  // Dates (backend variants)
  checkIn?: string;
  checkOut?: string;

  // Guest info
  mainGuest?: string;
  email?: string;
  customerName?: string;
  customerEmail?: string;

  guests?: {
    adults: number;
    children: number;
  };

  // Codes
  accessCode?: string;
  referenceCode?: string;
  confirmationCode?: string;

  // backend snake_case
  access_code?: string;
  reference_code?: string;
  confirmation_code?: string;
}

// ============================
// 5) OCR Extracted Data
// ============================
export interface ExtractedData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  fullName?: string;
  prefix?: string;

  documentNumber?: string;
  nationality?: string;
  gender?: string;
  dateOfBirth?: string;
  currentAddress?: string;
  dateOfArrival?: string;
  visaType?: string;
  stayExpiryDate?: string;
  pointOfEntry?: string;
  tmCardNumber?: string;
}

// ============================
// 6) GUEST
// ============================
export interface Guest {
  id: string;
  name: string;
  isMainGuest: boolean;
  progress: number;

  faceImage?: string;
  documentImage?: string;
  documentType?: DocumentType;

  details?: ExtractedData;

  bookingId?: number | string;
  
}

// ============================
// 7) CUSTOMER
// ============================
export interface Customer {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  nationality?: string;
}

// ============================
// 8) CONSENT
// ============================
export interface Consent {
  consentId: number;
  action?: string;
}

// ============================
// 9) BOOKING INFO (CHECK-IN TOKEN)
// ============================
export interface BookingInfo {
  id?: number;
  bookingId?: number;
  token?: string;
  checkinCode?: string;
  status?: string;
  expiresAt?: string;
  codeExpiresAt?: string;
  guestEmail?: string;
  guestLastName?: string;
}

// ============================
// 10) CONFIRM PAYLOAD
// ============================
export interface ConfirmPayload {
  token?: string;
  booking_id?: number;
  guests: Guest[];
  consents?: Consent[];
}
