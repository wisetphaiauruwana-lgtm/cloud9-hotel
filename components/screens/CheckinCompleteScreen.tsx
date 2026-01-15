import React, { useEffect, useState } from 'react';
import { Booking } from '../../types';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { BellIcon, CloudIcon } from '../icons/Icons';
import Button from '../ui/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { apiService } from '../../services/apiService';

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
  content: 'w-full max-w-[360px] text-center space-y-6',

  title: 'text-sm sm:text-base font-bold tracking-widest',

  logoBlock: 'flex flex-col items-center gap-2',
  logoText: 'text-lg font-bold tracking-wide text-gray-900',

  notificationBox:
    'bg-gray-100 rounded-2xl px-4 sm:px-6 py-4 space-y-2',

  bellIcon: 'w-6 h-6 text-amber-500',

  notificationText:
    'text-sm text-gray-700 leading-relaxed',

  accessBlock: 'space-y-2 text-left',
  accessLabel: 'text-sm font-semibold text-gray-700',

  accessCodeBox:
    'inline-flex items-center justify-center bg-emerald-500 text-white ' +
    'text-xl font-bold tracking-widest ' +
    'px-4 py-2 rounded-lg cursor-pointer select-none',

  copiedText: 'text-xs text-emerald-600',

  detailsBlock: 'text-left text-sm space-y-3',

  detailLabel: 'text-gray-600 font-semibold',
  detailValue: 'text-gray-900',

  roomItem: 'ml-2 text-gray-800',

  assistance:
    'text-xs text-gray-500 pt-2 text-center',

  footer: 'pt-2',
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
  const [roomsFromApi, setRoomsFromApi] = useState<any[] | null>(null);
  const [roomAccessMap, setRoomAccessMap] = useState<Record<string, string>>({});

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
        if (isActive) setRoomsFromApi(rooms);
      })
      .catch((err) => {
        console.error('[CheckinComplete] fetch booking failed', err);
        if (isActive) setRoomsFromApi(null);
      });

    return () => {
      isActive = false;
    };
  }, [token]);

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
  const rooms = roomsFromApi ?? booking?.rooms ?? [];

  useEffect(() => {
    if (rooms.length === 0) return;

    const hasAccessCode = rooms.some((r: any) =>
      (r?.accessCode ?? r?.access_code ?? r?.room?.accessCode ?? r?.room?.access_code ?? '').toString().trim()
    );
    if (hasAccessCode) return;

    let isActive = true;
    apiService
      .fetchAllRooms()
      .then((list: any[]) => {
        const map: Record<string, string> = {};
        (list ?? []).forEach((rm: any) => {
          const num = (rm?.roomNumber ?? rm?.room_number ?? rm?.roomCode ?? rm?.room_code ?? '').toString().trim();
          const code = (rm?.accessCode ?? rm?.access_code ?? '').toString().trim();
          if (num && code) map[num] = code;
        });
        if (isActive) setRoomAccessMap(map);
      })
      .catch((err) => {
        console.error('[CheckinComplete] fetch rooms failed', err);
        if (isActive) setRoomAccessMap({});
      });

    return () => {
      isActive = false;
    };
  }, [rooms]);

  const accessCodeItems = rooms
    .map((r: any) => {
      const roomNumber = (r?.room?.roomNumber ?? r?.roomNumber ?? r?.room?.room_code ?? r?.room_code ?? '-').toString();
      const code =
        (r?.accessCode ?? r?.access_code ?? r?.room?.accessCode ?? r?.room?.access_code ?? '').toString().trim() ||
        roomAccessMap[roomNumber] ||
        '';
      return { roomNumber, code };
    })
    .filter((item) => item.code);

  const accessCode =
    accessCodeItems.map((i) => i.code).join(' / ') ||
    booking?.referenceCode ||
    (booking as any)?.checkinCode ||
    (booking as any)?.checkin_code ||
    '-';

  const nights =
    rooms[0]?.nights ??
    calculateNights(
      booking?.stay?.from ?? (booking as any)?.checkIn,
      booking?.stay?.to ?? (booking as any)?.checkOut
    ) ??
    '-';

  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}, ${hh}:${mi}`;
  };

  const checkInRaw = booking?.stay?.from ?? (booking as any)?.checkIn ?? '';
  const checkOutRaw = booking?.stay?.to ?? (booking as any)?.checkOut ?? '';
  const checkIn = formatDateTime(checkInRaw);
  const checkOut = formatDateTime(checkOutRaw);

  const firstRoom = rooms[0];
  const roomNumber =
    (firstRoom as any)?.room?.roomNumber ??
    (firstRoom as any)?.roomNumber ??
    (firstRoom as any)?.room?.room_code ??
    (firstRoom as any)?.room_code ??
    '-';
  const roomFloor =
    (firstRoom as any)?.room?.floor ??
    (firstRoom as any)?.floor ??
    (firstRoom as any)?.room?.floorName ??
    (firstRoom as any)?.floorName ??
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
      <Header compact showLogo={false} showBorder={false} />

      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.logoBlock}>
            <CloudIcon className="w-10 h-10 text-gray-900" />
            <div className={styles.logoText}>cloud9</div>
          </div>

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

          {accessCodeItems.length > 0 ? (
            <div
              onClick={handleCopy}
              className={styles.accessCodeBox}
              title={token ? `token: ${token}` : undefined}
            >
              {accessCodeItems[0]?.code || accessCode}
            </div>
          ) : (
            <div
              onClick={accessCode !== '-' ? handleCopy : undefined}
              className={styles.accessCodeBox}
              title={token ? `token: ${token}` : undefined}
            >
              {accessCode}
            </div>
          )}

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
                {t('checkinComplete.roomNumber') || 'Room Number'}:
              </p>
              <p className={styles.detailValue}>{roomNumber}</p>
            </div>
            <div>
              <p className={styles.detailLabel}>
                {t('checkinComplete.floor') || 'Floor'}:
              </p>
              <p className={styles.detailValue}>{roomFloor}</p>
            </div>
            <div>
              <p className={styles.detailLabel}>
                {t('checkinComplete.from') || 'From'}:
              </p>
              <p className={styles.detailValue}>{checkIn}</p>
            </div>
            <div>
              <p className={styles.detailLabel}>
                {t('checkinComplete.to') || 'To'}:
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
        <Footer />
      </div>
    </div>
  );
};

export default CheckinCompleteScreen;
