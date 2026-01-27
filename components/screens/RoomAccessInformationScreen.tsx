import React, { useEffect, useState } from 'react';
import { Booking } from '../../types';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { BellIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';
import { apiService } from '../../services/apiService';

interface RoomAccessInformationScreenProps {
  booking: Booking;
  bookingId?: number | string;
  token?: string | null;
  onBack: () => void;
}

/* ===============================
   Small Components
=============================== */

const detailItemStyles = {
  container: 'w-full',
  label: 'text-base md:text-lg lg:text-xl font-semibold text-gray-500',
  value: 'text-lg md:text-xl lg:text-2xl text-gray-900',
};

const DetailItem: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <div className={detailItemStyles.container}>
    <p className={detailItemStyles.label}>{label}:</p>
    <p className={detailItemStyles.value}>{value}</p>
  </div>
);

/* ===============================
   Styles
=============================== */

const screenStyles = {
  container: 'flex flex-col min-h-screen bg-white',
  main: 'flex-grow flex flex-col p-6 md:p-8 lg:p-12 space-y-8',

  title:
    'text-xl md:text-2xl lg:text-3xl font-bold text-center tracking-wider text-gray-900',

  notificationBox:
    'bg-amber-50 text-amber-900 text-sm md:text-base lg:text-lg p-4 rounded-xl flex items-start space-x-3 border border-amber-100',

  bellIcon:
    'w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-amber-500 flex-shrink-0',

  notificationText: 'text-left pt-1',

  detailsContainer:
    'w-full text-left space-y-6 md:space-y-7 lg:space-y-8',

  accessCodeLabel:
    'text-base md:text-lg lg:text-xl font-semibold text-gray-500',

  accessCodeValue:
    'mt-1 bg-teal-600 text-white text-center text-4xl md:text-5xl lg:text-6xl font-bold tracking-widest py-3 md:py-4 lg:py-5 rounded-xl shadow-lg',

  roomBlock:
    'space-y-3 border-t border-gray-200 pt-4',

  flexGrow: 'flex-grow',

  assistanceText:
    'text-sm md:text-base lg:text-lg text-gray-500 text-center',
};

/* ===============================
   Component
=============================== */

const RoomAccessInformationScreen: React.FC<
  RoomAccessInformationScreenProps
> = ({ booking, bookingId, token, onBack }) => {
  const { t } = useTranslation();
  const [roomsFromApi, setRoomsFromApi] = useState<any[] | null>(null);
  const [bookingFromApi, setBookingFromApi] = useState<any | null>(null);

  const resolveBookingId = () => {
    const fromProp = Number(bookingId);
    if (!Number.isNaN(fromProp) && fromProp > 0) return fromProp;

    const fromBooking =
      Number((booking as any)?.dbId ?? (booking as any)?.id ?? (booking as any)?.bookingId ?? (booking as any)?.booking_id);
    if (!Number.isNaN(fromBooking) && fromBooking > 0) return fromBooking;

    try {
      const qs = new URLSearchParams(window.location.search);
      const fromQuery = Number(qs.get('bookingId') ?? qs.get('booking_id'));
      if (!Number.isNaN(fromQuery) && fromQuery > 0) return fromQuery;
    } catch {
      // ignore
    }

    try {
      const stored = Number(localStorage.getItem('checkin_booking_id'));
      if (!Number.isNaN(stored) && stored > 0) return stored;
    } catch {
      // ignore
    }

    return undefined;
  };

  /* ---------- Date helpers ---------- */

  const formatDateTime = (v?: string | null): string => {
    if (!v) return '-';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '-';

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      try {
        if (token) {
          const resp: any = await apiService.getBookingByToken(token);
          const bk =
            resp?.data?.booking ??
            resp?.data ??
            resp?.booking ??
            resp;
          const rooms = Array.isArray(bk?.rooms) ? bk.rooms : [];
          if (isActive) {
            setBookingFromApi(bk);
            setRoomsFromApi(rooms);
          }
          return;
        }

        const bid = resolveBookingId();
        if (!bid) return;

        const resp: any = await apiService.getBookingDetailsById(bid);
        const bk =
          resp?.data?.booking ??
          resp?.data ??
          resp?.booking ??
          resp;
        const rooms = Array.isArray(bk?.rooms) ? bk.rooms : [];
        if (isActive) {
          setBookingFromApi(bk);
          setRoomsFromApi(rooms);
        }
      } catch (err) {
        console.error('[RoomAccessInformation] fetch booking failed', err);
        if (isActive) {
          setBookingFromApi(null);
          setRoomsFromApi(null);
        }
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [token, bookingId, booking]);

  const rooms = roomsFromApi ?? booking?.rooms ?? [];

  const resolveRoomFloor = (r: any): string => {
    const roomNumber =
      (r?.room?.roomNumber ?? r?.roomNumber ?? r?.room?.room_code ?? r?.room_code ?? '').toString();
    const direct =
      (r?.room?.floor ??
        r?.floor ??
        r?.room?.level ??
        r?.level ??
        r?.room?.floorNumber ??
        r?.floorNumber ??
        r?.room?.floor_number ??
        r?.floor_number ??
        r?.room?.roomFloor ??
        r?.roomFloor ??
        (booking as any)?.room?.floor ??
        '').toString().trim();
    if (direct) return direct;
    const match = roomNumber.match(/\d+/);
    return match ? match[0].charAt(0) : '';
  };

  const formatFloorLabel = (floor: string) => (floor ? `${floor}st Floor` : '-');

  const accessCodeItems = rooms
    .map((r: any) => {
      const roomNumber = (r?.room?.roomNumber ?? r?.roomNumber ?? r?.room?.room_code ?? r?.room_code ?? '-').toString();
      const code = (r?.accessCode ?? r?.access_code ?? r?.room?.accessCode ?? r?.room?.access_code ?? '').toString().trim();
      const floor = resolveRoomFloor(r);
      return { roomNumber, code, floor };
    })
    .filter((item) => item.code);

  const fallbackAccessCode =
    (bookingFromApi as any)?.accessCode ??
    (booking as any)?.accessCode ??
    booking?.referenceCode ??
    (booking as any)?.checkinCode ??
    (booking as any)?.checkin_code ??
    '-';

  const accessCode =
    accessCodeItems.map((i) => i.code).join(' / ') ||
    fallbackAccessCode;

  const stayFrom =
    bookingFromApi?.stay?.from ??
    (bookingFromApi as any)?.checkIn ??
    (bookingFromApi as any)?.checkInDate ??
    (bookingFromApi as any)?.stayDuration?.split?.(' - ')?.[0] ??
    (booking as any)?.stay?.from ??
    (booking as any)?.checkIn ??
    (booking as any)?.checkInDate ??
    (booking as any)?.stayDuration?.split?.(' - ')?.[0] ??
    '';

  const stayTo =
    bookingFromApi?.stay?.to ??
    (bookingFromApi as any)?.checkOut ??
    (bookingFromApi as any)?.checkOutDate ??
    (bookingFromApi as any)?.stayDuration?.split?.(' - ')?.[1] ??
    (booking as any)?.stay?.to ??
    (booking as any)?.checkOut ??
    (booking as any)?.checkOutDate ??
    (booking as any)?.stayDuration?.split?.(' - ')?.[1] ??
    '';

  return (
    <div className={screenStyles.container}>
      <Header onBack={onBack} />

      <main className={screenStyles.main}>
        <h1 className={screenStyles.title}>
          {t('roomAccess.title') || 'Room Access Information'}
        </h1>

        {/* ===== Notification ===== */}
        <div className={screenStyles.notificationBox}>
          <BellIcon className={screenStyles.bellIcon} />
          <p className={screenStyles.notificationText}>
            {t('checkinComplete.notification') ||
              'Your access code is essential. Please keep this information.'}
          </p>
        </div>

        {/* ===== Access Code ===== */}
        <div>
          <p className={screenStyles.accessCodeLabel}>
            {t('checkinComplete.accessCode') || 'Access Code'}
          </p>
          <div className={screenStyles.accessCodeValue}>
            {accessCode}
          </div>
        </div>

        {/* ===== Rooms Info ===== */}
        <div className={screenStyles.detailsContainer}>
          {accessCodeItems.length > 0 ? (
            accessCodeItems.map((item, idx) => (
              <div key={`${item.roomNumber}-${idx}`} className={screenStyles.roomBlock}>
                <DetailItem
                  label={t('checkinComplete.roomNumber') || 'Room Number'}
                  value={item.roomNumber}
                />
                <DetailItem
                  label={t('checkinComplete.floor') || 'Floor'}
                  value={formatFloorLabel(item.floor)}
                />
              </div>
            ))
          ) : (
            rooms.map((r, idx) => {
              const roomAny = r as any;
              const roomNumber =
                r.room?.roomNumber ??
                roomAny.roomNumber ??
                '-';
              const floor = resolveRoomFloor(r);

              return (
                <div key={idx} className={screenStyles.roomBlock}>
                  <DetailItem
                    label={t('checkinComplete.roomNumber') || 'Room Number'}
                    value={roomNumber}
                  />
                  <DetailItem
                    label={t('checkinComplete.floor') || 'Floor'}
                    value={formatFloorLabel(floor)}
                  />
                </div>
              );
            })
          )}

          <DetailItem
            label={t('checkinComplete.from') || 'From'}
            value={formatDateTime(stayFrom)}
          />

          <DetailItem
            label={t('checkinComplete.to') || 'To'}
            value={formatDateTime(stayTo)}
          />
        </div>

        <div className={screenStyles.flexGrow} />

        <p className={screenStyles.assistanceText}>
          {t('checkinComplete.assistance') ||
            'For urgent assistance, please contact the front desk.'}
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default RoomAccessInformationScreen;
