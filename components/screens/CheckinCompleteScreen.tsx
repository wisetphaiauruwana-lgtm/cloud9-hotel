import React, { useState } from 'react';
import { Booking } from '../../types';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { BellIcon } from '../icons/Icons';
import Button from '../ui/Button';
import { useTranslation } from '../../hooks/useTranslation';

interface CheckinCompleteScreenProps {
  booking: Booking | null;
  token?: string | null;
  onFinish: () => void;
}

/* ===============================
   Styles
=============================== */
const styles = {
  container: 'flex flex-col min-h-screen bg-white',
  main: 'flex-grow flex justify-center px-4 sm:px-6 py-6',
  content: 'w-full max-w-[768px] text-center space-y-6',

  title: 'text-base sm:text-lg md:text-xl font-bold tracking-widest',

  notificationBox:
    'bg-gray-100 rounded-2xl px-4 sm:px-6 md:px-8 py-4 md:py-6 space-y-2',

  bellIcon: 'w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-amber-500',

  notificationText:
    'text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed',

  accessBlock: 'space-y-2 text-left',
  accessLabel: 'text-sm sm:text-base md:text-lg font-medium text-gray-600',

  accessCodeBox:
    'inline-flex items-center justify-center bg-emerald-500 text-white ' +
    'text-lg sm:text-xl md:text-2xl font-bold tracking-widest ' +
    'px-4 py-2 rounded-lg cursor-pointer select-none',

  copiedText: 'text-xs sm:text-sm md:text-base text-emerald-600',

  detailsBlock: 'text-left text-sm sm:text-base md:text-lg space-y-4',

  detailLabel: 'text-gray-500',
  detailValue: 'font-medium',

  roomItem: 'ml-2 text-gray-800',

  assistance:
    'text-xs sm:text-sm md:text-base text-gray-500 pt-4 text-center',

  footer: 'p-6',
};

/* ===============================
   Component
=============================== */

const CheckinCompleteScreen: React.FC<CheckinCompleteScreenProps> = ({
  booking,
  token,
  onFinish,
}) => {
  const { t } = useTranslation();

  // ✅ NOTE:
  // เอา auto-redirect ออก เพื่อไม่ให้หน้าหาย/เด้งเร็ว
  // การกัน "เช็คอินซ้ำ" ให้ไปจัดการใน App.tsx (handleCodeSubmit) แทน

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
    'idle'
  );

  const calculateNights = (from?: string, to?: string): number | null => {
    if (!from || !to) return null;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;

    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  /* ---------- Source of truth ---------- */
  const accessCode =
    booking?.referenceCode ??
    (booking as any)?.checkinCode ??
    (booking as any)?.checkin_code ??
    '-';

  const rooms = booking?.rooms ?? [];

  const nights =
    rooms[0]?.nights ??
    calculateNights(
      booking?.stay?.from ?? (booking as any)?.checkIn,
      booking?.stay?.to ?? (booking as any)?.checkOut
    ) ??
    '-';

  const checkIn =
    booking?.stay?.from?.split('T')[0] ??
    (booking as any)?.checkIn?.split?.('T')?.[0] ??
    '-';

  const checkOut =
    booking?.stay?.to?.split('T')[0] ??
    (booking as any)?.checkOut?.split?.('T')?.[0] ??
    '-';

  /* ---------- Copy ---------- */
  const handleCopy = async () => {
    if (!accessCode || accessCode === '-') return;

    try {
      await navigator.clipboard.writeText(String(accessCode));
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('failed');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  /* ===============================
     Render
  =============================== */
  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        <div className={styles.content}>
          {/* Title */}
          <h1 className={styles.title}>
            {t('checkinComplete.title') || 'Check-in Complete'}
          </h1>

          {/* Notification */}
          <div className={styles.notificationBox}>
            <div className="flex justify-center">
              <BellIcon className={styles.bellIcon} />
            </div>
            <p className={styles.notificationText}>
              {t('checkinComplete.notification') ||
                'Your access code is essential. Please keep this information.'}
            </p>
          </div>

          {/* Access Code */}
          <div className={styles.accessBlock}>
            <p className={styles.accessLabel}>
              {t('checkinComplete.accessCode') || 'Access Code'}
            </p>

            <div
              onClick={accessCode !== '-' ? handleCopy : undefined}
              className={styles.accessCodeBox}
              title={token ? `token: ${token}` : undefined}
            >
              {accessCode}
            </div>

            {copyStatus === 'copied' && (
              <p className={styles.copiedText}>
                {t('checkinComplete.copied') || 'Copied'}
              </p>
            )}
            {copyStatus === 'failed' && (
              <p className="text-xs sm:text-sm md:text-base text-red-500">
                {t('checkinComplete.copyFailed') || 'Copy failed'}
              </p>
            )}
          </div>

          {/* Booking Details */}
          <div className={styles.detailsBlock}>
            <div>
              <p className={styles.detailLabel}>
                {t('checkinComplete.nights') || 'Nights'}:
              </p>
              <p className={styles.detailValue}>{nights}</p>
            </div>

            <div>
              <p className={styles.detailLabel}>
                {t('checkinComplete.rooms') || 'Rooms'}:
              </p>
              <p className={styles.detailValue}>{rooms.length}</p>
            </div>

            {rooms.map((r, idx) => {
              const roomNumber = (r as any)?.room?.roomNumber ?? (r as any)?.roomNumber ?? '-';
              const roomType = (r as any)?.room?.type ?? (r as any)?.roomType ?? '';

              return (
                <p key={idx} className={styles.roomItem}>
                  {roomNumber}
                  {roomType ? ` (${roomType})` : ''}
                </p>
              );
            })}

            <div>
              <p className={styles.detailLabel}>
                {t('checkinComplete.checkIn') || 'Check-in'}:
              </p>
              <p className={styles.detailValue}>{checkIn}</p>
            </div>

            <div>
              <p className={styles.detailLabel}>
                {t('checkinComplete.checkOut') || 'Check-out'}:
              </p>
              <p className={styles.detailValue}>{checkOut}</p>
            </div>
          </div>

          {/* Assistance */}
          <p className={styles.assistance}>
            {t('checkinComplete.assistance') ||
              'For urgent assistance, please contact the front desk.'}
          </p>
        </div>
      </main>

      <div className={styles.footer}>
        <Button onClick={onFinish}>
          {t('buttons.finish') || 'Finish'}
        </Button>
      </div>

      <Footer />
    </div>
  );
};

export default CheckinCompleteScreen;
