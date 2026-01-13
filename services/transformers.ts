// services/transformers.ts
import { Booking } from '../types';

export function transformBookingInfoToBooking(raw: any): Booking {
  // ตัวอย่าง mapping — ปรับตามชนิดข้อมูลของคุณ
  return {
    id: raw.bookingId ?? raw.booking_id ?? raw.bookingId,
    dbId: raw.bookingId ?? raw.booking_id ?? raw.bookingId,
    mainGuest: `${raw.guestFirstName ?? ''} ${raw.guestLastName ?? raw.guestLastName ?? ''}`.trim() || (raw.guestLastName ?? raw.guest_name),
    email: raw.guestEmail ?? raw.email ?? raw.guest_email,
    confirmationCode: raw.checkinCode ?? raw.confirmationCode ?? raw.accessCode,
    status: raw.status ?? '',
    stay: {
      from: raw.checkIn ?? raw.check_in ?? raw.from ?? raw.stay?.from ?? raw.start ?? raw.arrival ?? raw.arrivalDate ?? raw.fromDate,
      to: raw.checkOut ?? raw.check_out ?? raw.to ?? raw.stay?.to ?? raw.end ?? raw.departure ?? raw.departureDate ?? raw.toDate,
      nights: raw.nights ?? raw.stay?.nights ?? raw.nightsCount ?? raw.durationNights ?? raw._nights,
      hours: raw.stay?.hours ?? raw.hours ?? raw._hours,
    },
    guests: (() => {
      if (raw.guests) return raw.guests;
      if (raw.party) return raw.party;
      // If backend gives a simple partySize/guestCount we store as object
      const adults = raw.adults ?? raw.numAdults ?? raw.num_adults ?? raw.adult ?? raw.guestAdults ?? raw.partySize ?? raw.guestCount ?? raw.guest_count ?? undefined;
      const children = raw.children ?? raw.numChildren ?? raw.num_children ?? raw.child ?? raw.guestChildren ?? raw.childCount ?? undefined;
      if (adults !== undefined || children !== undefined) {
        return { adults: adults ?? 0, children: children ?? 0 };
      }
      return undefined;
    })(),
    room: {
      roomNumber: raw.roomNumber ?? raw.room?.roomNumber ?? raw.room?.room_number ?? raw.room_code ?? raw.room_number ?? raw.roomId ?? raw.roomIdStr,
      type: raw.roomType ?? raw.room?.type ?? raw.room_name ?? raw.room?.name ?? raw.room_type,
      charges: raw.room?.charges ?? raw.charges ?? raw.roomCharge ?? raw.room_charge ?? raw.chargesOnArrival?.roomGuarantee ?? raw.room?.price,
    } as any,
    // keep raw for debugging if needed
    _raw: raw,
  } as Booking;
}

/** simple mask for email on frontend if backend returns full email */
export function maskEmailFrontend(email?: string | null) {
  if (!email) return '';
  const e = String(email).trim();
  const parts = e.split('@');
  if (parts.length !== 2) return e;
  const local = parts[0];
  const domain = parts[1];
  const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local.slice(-1) : (local.length === 2 ? local[0] + '*' : '*');
  const dparts = domain.split('.');
  if (dparts.length >= 2) {
    dparts[0] = dparts[0].length > 1 ? dparts[0][0] + '*'.repeat(dparts[0].length - 1) : '*';
  }
  return `${maskedLocal}@${dparts.join('.')}`;
}
