export interface Booking {
  // ============================
  // IDs
  // ============================
  id?: number | string;
  dbId?: number;

  // ============================
  // Stay (ใช้ทุกหน้า)
  // ============================
  stay?: {
    from?: string | null;
    to?: string | null;
    nights?: number | null;
    hours?: number | null;
  };

  // ============================
  // Rooms (ของจริง)
  // ============================
  rooms?: {
    id?: number;
    room?: {
      id?: number;
      roomNumber?: string;
      roomCode?: string;
      type?: string;
    };
    roomNumber?: string; // fallback
  }[];

  // ============================
  // Legacy single-room fallback
  // ============================
  room?: {
    roomNumber?: string;
    type?: string;
    floor?: string;
  };

  // ============================
  // Dates (backend variants)
  // ============================
  checkIn?: string;
  checkOut?: string;
  checkInDate?: string;
  checkOutDate?: string;

  // ============================
  // Guest info
  // ============================
  mainGuest?: string;
  email?: string;
  customerName?: string;
  customerEmail?: string;

  guests?: {
    adults: number;
    children: number;
  };

  // ============================
  // Codes
  // ============================
  accessCode?: string;
  referenceCode?: string;
  confirmationCode?: string;

  // backend snake_case
  access_code?: string;
  reference_code?: string;
  confirmation_code?: string;
}
export interface BookingRoom {
  id?: number;
  nights?: number;
  room?: {
    roomNumber?: string;
  };
}
