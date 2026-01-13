import React from 'react';
import { Booking } from '../../types';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { BellIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';

interface RoomAccessInformationScreenProps {
  booking: Booking;
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
> = ({ booking, onBack }) => {
  const { t } = useTranslation();

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

  /* ===============================
     ✅ SINGLE SOURCE OF TRUTH
     Access Code (อันเดียว)
  =============================== */

  const accessCode =
    (booking as any)?.accessCode ??
    booking?.referenceCode ??
    (booking as any)?.checkinCode ??
    (booking as any)?.checkin_code ??
    '-';

  const rooms = booking?.rooms ?? [];

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

        {/* ===== Access Code (ONE ONLY) ===== */}
        <div>
          <p className={screenStyles.accessCodeLabel}>
            {t('checkinComplete.accessCode') || 'Access Code'}
          </p>
          <div className={screenStyles.accessCodeValue}>
            {accessCode}
          </div>
        </div>

        {/* ===== Rooms Info (Room + Floor only) ===== */}
        <div className={screenStyles.detailsContainer}>
          {rooms.map((r, idx) => {
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
          })}

          <DetailItem
            label={t('checkinComplete.from') || 'From'}
            value={formatDateTime(booking.stay?.from)}
          />

          <DetailItem
            label={t('checkinComplete.to') || 'To'}
            value={formatDateTime(booking.stay?.to)}
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
