// src/services/apiService.ts
import * as Guests from './api.guests';
import * as Bookings from './api.bookings';
import * as Customers from './api.customers';
import * as Ocr from './api.ocr';
import * as Consents from './api.consents';

export const apiService = {
  // customers
  createCustomer: Customers.createCustomer,

  // bookings
  createBooking: Bookings.createBooking,
  initiateCheckIn: Bookings.initiateCheckIn,
  getBookingInfoByToken: Bookings.getBookingInfoByToken,
  getBookingByToken: Bookings.getBookingByToken,
  getBookingDetailsById: Bookings.getBookingDetailsById,
  verifyCheckinCode: Bookings.verifyCheckinCode,
  resendCheckinCode: Bookings.resendCheckinCode,
  saveCheckIn: Bookings.saveCheckIn,
  fetchAllRooms: Bookings.fetchAllRooms,
  getBookingDetails: Bookings.getBookingDetails,

  // guests
  fetchGuests: Guests.fetchGuests,  // ดึงข้อมูลผู้เข้าพัก
  createGuest: Guests.createGuest,  // สร้างผู้เข้าพักใหม่

  // ocr
  verifyIDCard: Ocr.verifyIDCard,
  verifyPassport: Ocr.verifyPassport,

  // consents
  createConsent: Consents.createConsent,
  acceptConsent: Consents.acceptConsent,
  createConsentLog: Consents.createConsentLog,
  attachConsentLogs: Consents.attachConsentLogs,
};

export default apiService;
