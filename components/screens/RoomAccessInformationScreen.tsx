import React, { useEffect, useState } from 'react';
import { Booking } from '../../types';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { BellIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';
import { apiService } from '../../services/apiService';

interface RoomAccessInformationScreenProps {
  booking: Booking;
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
> = ({ booking, token, onBack }) => {
  const { t } = useTranslation();
  const [roomsFromApi, setRoomsFromApi] = useState<any[] | null>(null);
  const [bookingFromApi, setBookingFromApi] = useState<any | null>(null);

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
    if (!token) return;

    let isActive = true;
    apiService
      .getBookingByToken(token)
      .then((resp: any) => {
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
      })
      .catch((err) => {
        console.error('[RoomAccessInformation] fetch booking failed', err);
        if (isActive) {
          setBookingFromApi(null);
          setRoomsFromApi(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [token]);

  const rooms = roomsFromApi ?? booking?.rooms ?? [];

  const accessCodeItems = rooms
    .map((r: any) => {
      const roomNumber = (r?.room?.roomNumber ?? r?.roomNumber ?? r?.room?.room_code ?? r?.room_code ?? '-').toString();
      const code = (r?.accessCode ?? r?.access_code ?? r?.room?.accessCode ?? r?.room?.access_code ?? '').toString().trim();
      return { roomNumber, code };
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
    (booking as any)?.stay?.from ??
    (booking as any)?.checkIn ??
    (booking as any)?.checkInDate ??
    '';

  const stayTo =
    bookingFromApi?.stay?.to ??
    (bookingFromApi as any)?.checkOut ??
    (bookingFromApi as any)?.checkOutDate ??
    (booking as any)?.stay?.to ??
    (booking as any)?.checkOut ??
    (booking as any)?.checkOutDate ??
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
                  label={t('checkinComplete.accessCode') || 'Access Code'}
                  value={item.code}
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

              return (
                <div key={idx} className={screenStyles.roomBlock}>
                  <DetailItem
                    label={t('checkinComplete.roomNumber') || 'Room Number'}
                    value={roomNumber}
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
