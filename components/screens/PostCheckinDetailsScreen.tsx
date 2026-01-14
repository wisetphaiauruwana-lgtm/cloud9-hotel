// src/components/screens/PostCheckinDetailsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/apiService';
import { Booking } from '../../types';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Button from '../ui/Button';
import { ChevronRightIcon, LocationIcon, PhoneIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';

/* --------------------
   Local Components
-------------------- */

const DetailRow: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-sm md:text-base text-gray-500">{label}</p>
    <div className="text-sm md:text-base font-medium text-gray-900">{value}</div>
  </div>
);

const ActionLink: React.FC<{
  label: string;
  onClick: () => void;
}> = ({ label, onClick }) => (
  <button onClick={onClick} className="w-full flex justify-between items-center py-4">
    <span className="text-sm md:text-base font-medium text-gray-800">{label}</span>
    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
  </button>
);

/* --------------------
   Helpers
-------------------- */

const toNumberOrUndef = (v: any): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const calculateNights = (from?: string, to?: string): number | null => {
  if (!from || !to) return null;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  const diffMs = toDate.getTime() - fromDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
};

const formatDateOnly = (value?: string) => {
  if (!value) return '-';
  return value.split('T')[0];
};

const unwrapBooking = (resp: any) =>
  resp?.data?.booking ?? resp?.data ?? resp?.booking ?? resp?.payload ?? resp;

const pickEmailFromBooking = (b: any): string => {
  const v =
    b?.email ??
    b?.guestEmail ??
    b?.guest_email ??
    b?.customerEmail ??
    b?.customer_email ??
    b?.customer?.email ??
    b?.main_guest?.email ??
    b?.guest?.email ??
    '';
  return String(v ?? '').trim();
};

const pickMainGuestFromBooking = (b: any): string => {
  const v =
    b?.mainGuest ??
    b?.mainGuestName ??
    b?.guestName ??
    b?.customerName ??
    b?.main_guest?.full_name ??
    b?.main_guest?.name ??
    b?.customer?.full_name ??
    b?.customer?.name ??
    '';
  return String(v ?? '').trim();
};

/* ----------------- Local guest cache + merge (prefer cache) ----------------- */
const GUEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const guestCacheKey = (bookingId: number) => `guest_cache_${bookingId}`;

const loadGuestCache = (bookingId: number): any[] => {
  try {
    const raw = localStorage.getItem(guestCacheKey(bookingId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.__ts ?? 0);
    const ok = ts && Date.now() - ts < GUEST_CACHE_TTL_MS;
    if (!ok) return [];
    return Array.isArray(parsed?.guests) ? parsed.guests : [];
  } catch {
    return [];
  }
};

const guestKeyStable = (g: any) => {
  const doc = String(g?.details?.documentNumber ?? g?.id_number ?? '').trim();
  const fn = String(g?.details?.firstName ?? g?.first_name ?? g?.firstName ?? '').trim();
  const ln = String(g?.details?.lastName ?? g?.last_name ?? g?.lastName ?? '').trim();
  const dob = String(g?.details?.dateOfBirth ?? g?.date_of_birth ?? g?.dateOfBirth ?? '').trim();
  const name = String(g?.name ?? g?.full_name ?? g?.fullName ?? '').trim();

  if (doc) return `DOC:${doc}`;
  if ((fn || ln) && dob) return `NDO:${fn}|${ln}|${dob}`;
  if (name) return `NAME:${name}`;
  return `ID:${String(g?.id ?? '')}`;
};

// ✅ merge: cache ชนะ backend เสมอ
const mergeGuestsPreferCache = (backendList: any[], cacheList: any[]) => {
  const map = new Map<string, any>();

  for (const g of backendList || []) {
    map.set(guestKeyStable(g), g);
  }

  for (const c of cacheList || []) {
    const k = guestKeyStable(c);
    const prev = map.get(k) || {};
    map.set(k, {
      ...prev,
      ...c,
      details: { ...(prev.details || {}), ...(c.details || {}) },
      name: c.name ?? prev.name,
      documentType: c.documentType ?? prev.documentType,
      faceImage: c.faceImage ?? prev.faceImage,
      documentImage: c.documentImage ?? prev.documentImage,
      isMainGuest: typeof c.isMainGuest === 'boolean' ? c.isMainGuest : prev.isMainGuest,
    });
  }

  const out = Array.from(map.values());
  out.sort(
    (a, b) =>
      Number(!!(b.isMainGuest ?? b.is_main_guest ?? b.mainGuest)) -
      Number(!!(a.isMainGuest ?? a.is_main_guest ?? a.mainGuest))
  );

  return out;
};

/* --------------------
   Screen
-------------------- */

interface PostCheckinDetailsScreenProps {
  booking: Booking | null;
  bookingId?: number | string;
  token?: string | null;

  onBack: () => void;
  onCheckout: () => void;
  onViewGuests: (bookingId?: number | string) => void;
  onViewRoomAccess: () => void;
  onExtendStay: () => void;
}

const PostCheckinDetailsScreen: React.FC<PostCheckinDetailsScreenProps> = ({
  booking,
  bookingId,
  token,
  onBack,
  onCheckout,
  onViewGuests,
  onViewRoomAccess,
  onExtendStay,
}) => {
  const { t } = useTranslation();

  const [guestList, setGuestList] = useState<any[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);

  // ✅ ค่าที่ "ชัวร์" หลังรีเฟรช/กดลิงก์
  const [liveBooking, setLiveBooking] = useState<any>(null);

  const baseBooking: any = liveBooking ?? booking;

  // --------------------
  // Resolve bookingId
  // --------------------
  const resolvedBookingId = useMemo(() => {
    return (
      toNumberOrUndef(bookingId) ??
      toNumberOrUndef(liveBooking?.dbId) ??
      toNumberOrUndef(liveBooking?.id) ??
      toNumberOrUndef(liveBooking?.bookingId) ??
      toNumberOrUndef(liveBooking?.booking_id) ??
      toNumberOrUndef((booking as any)?.dbId) ??
      toNumberOrUndef((booking as any)?.id) ??
      toNumberOrUndef((booking as any)?.bookingId) ??
      toNumberOrUndef((booking as any)?.booking_id)
    );
  }, [booking, bookingId, liveBooking]);


  // --------------------
  // 1) โหลด booking สดจาก token เพื่อเอา email/mainGuest ที่ "ไม่หาย"
  // --------------------
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const tokenStr = token ?? localStorage.getItem('checkin_token');
        if (!tokenStr) return;
        const bkResp: any = await (apiService as any).getBookingByToken(tokenStr);
        const bk: any = unwrapBooking(bkResp);
        if (!mounted) return;
        setLiveBooking(bk);
      } catch {
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [token]);

  // --------------------
  // 2) โหลด guests แล้ว merge กับ cache (ให้ cache ชนะ)
  // ✅ FIX: apiService.fetchGuests(bid) คืน Guest[] แล้ว (ไม่ใช่ resp object)
  // --------------------
 useEffect(() => {
  let mounted = true;

  const run = async () => {
    const bid =
      resolvedBookingId ?? 
      toNumberOrUndef(liveBooking?.dbId) ?? 
      toNumberOrUndef(liveBooking?.id) ?? 
      toNumberOrUndef(liveBooking?.bookingId) ?? 
      toNumberOrUndef(liveBooking?.booking_id);

    if (!bid) {
      if (mounted) {
        setGuestList([]);
        setGuestLoading(false);
      }
      return;
    }

    try {
      setGuestLoading(true);

      // เช็คว่า guestList ที่ดึงมามีค่าหรือไม่
      const backendList: any[] = await apiService.fetchGuests(bid);

      const cacheList = loadGuestCache(bid);
      const merged = mergeGuestsPreferCache(
        Array.isArray(backendList) ? backendList : [],
        Array.isArray(cacheList) ? cacheList : []
      );

      if (!mounted) return;
      setGuestList(merged);
    } catch {
      // หากเกิดข้อผิดพลาด, ใช้ข้อมูลจาก cache
      const cacheOnly = loadGuestCache(bid);
      if (mounted) setGuestList(Array.isArray(cacheOnly) ? cacheOnly : []);
    } finally {
      if (mounted) setGuestLoading(false);
    }
  };

  run();
  return () => {
    mounted = false;
  };
  }, [resolvedBookingId, liveBooking]);

  // 🛡 กัน crash (หลัง hooks)
  if (!booking && !liveBooking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-600">Booking not found</p>
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  }


  // --------------------
  // Extract Main Guest from guest list
  // ✅ FIX: รองรับทั้ง details camelCase และ snake_case
  // --------------------
  const mainGuestFromGuests = useMemo(() => {
    if (!guestList.length) return '';
    const mg = guestList.find((g: any) => !!(g.isMainGuest ?? g.is_main_guest ?? g.mainGuest)) || guestList[0];
    const first = mg?.details?.firstName ?? mg?.first_name ?? mg?.firstName ?? '';
    const last = mg?.details?.lastName ?? mg?.last_name ?? mg?.lastName ?? '';
    const name = (mg?.full_name ?? mg?.fullName ?? mg?.name ?? `${first} ${last}`)?.toString().trim();
    return name || '';
  }, [guestList]);


  // --------------------
  // Normalize display fields
  // --------------------
  const mainGuest =
    pickMainGuestFromBooking(liveBooking) ||
    mainGuestFromGuests ||
    pickMainGuestFromBooking(booking) ||
    '-';

  const email = pickEmailFromBooking(liveBooking) || pickEmailFromBooking(booking) || '-';

  const stayFrom =
    baseBooking?.stay?.from ||
    baseBooking?.checkInDate ||
    baseBooking?.checkIn ||
    baseBooking?.from ||
    '';

  const stayTo =
    baseBooking?.stay?.to ||
    baseBooking?.checkOutDate ||
    baseBooking?.checkOut ||
    baseBooking?.to ||
    '';

  const guestSummary = baseBooking?.guests || {};
  const adults = (guestSummary as any)?.adults ?? (guestSummary as any)?.totalAdults ?? 0;
  const children = (guestSummary as any)?.children ?? (guestSummary as any)?.totalChildren ?? 0;

  const numGuestsValue =
    t('reservationDetails.numGuestsValue', { adults, children }) ||
    `${adults} Adult(s), ${children} Child(ren)`;

  const rooms = baseBooking?.rooms ?? [];
  const roomsCount = rooms.length;
  const safeRooms = (rooms as any[]) ?? [];

  const nights = (rooms as any)?.[0]?.nights ?? calculateNights(stayFrom, stayTo) ?? '-';

  // --------------------
  // Render
  // --------------------
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header onBack={onBack} />

      <main className="flex-grow px-4 py-6">
        <div className="mx-auto w-full max-w-[420px] md:max-w-[720px] space-y-5">
          <div className="flex justify-between items-center">
            <h1 className="text-lg md:text-xl font-bold text-gray-900">{t('postCheckin.title')}</h1>
            <div className="flex items-center gap-3 text-gray-400">
              <LocationIcon className="w-5 h-5" />
              <PhoneIcon className="w-5 h-5" />
            </div>
          </div>

          <span className="inline-block bg-green-100 text-green-700 text-xs md:text-sm font-semibold px-3 py-1 rounded-full">
            {t('postCheckin.status')}
          </span>

          <div className="space-y-4 pt-2">
            <DetailRow
              label={t('postCheckin.mainGuest')}
              value={
                <div className="flex items-center gap-2">
                  <span>{mainGuest}</span>
                  {guestLoading && (
                    <span className="text-xs text-gray-400">({t('common.loading') || 'Loading...'})</span>
                  )}
                </div>
              }
            />

            <DetailRow
              label={t('postCheckin.email')}
              value={
                <div className="flex items-center gap-2">
                  <span>{email}</span>
                  {guestLoading && (
                    <span className="text-xs text-gray-400">({t('common.loading') || 'Loading...'})</span>
                  )}
                </div>
              }
            />

            <DetailRow label={t('postCheckin.numGuests')} value={numGuestsValue} />

            <DetailRow
              label={t('postCheckin.stayDuration')}
              value={
                <>
                  {t('reservationDetails.from')} {formatDateOnly(stayFrom)}
                  <br />
                  {t('reservationDetails.to')} {formatDateOnly(stayTo)}
                </>
              }
            />

            <DetailRow
              label={t('reservationDetails.nights')}
              value={`${nights} ${t('reservationDetails.nightsLabel')}`}
            />

            <DetailRow
              label={t('reservationDetails.rooms')}
              value={
                <div className="space-y-1">
                  <div className="font-medium">{roomsCount}</div>
                  {safeRooms.map((r, idx) => {
                    const roomNumber =
                      r.room?.roomNumber ?? r.room?.roomCode ?? r.roomNumber ?? r.roomCode ?? r.number ?? '-';

                    const roomType = r.room?.type ?? r.room?.name ?? r.roomType ?? '-';

                    return (
                      <div key={idx} className="ml-2 text-gray-800">
                        {roomNumber}
                        {roomType !== '-' ? ` (${roomType})` : ''}
                      </div>
                    );
                  })}
                </div>
              }
            />
          </div>

          <div className="divide-y divide-gray-200 pt-2">
            <ActionLink
              label={t('postCheckin.viewGuests')}
              onClick={() => onViewGuests(resolvedBookingId)}
            />
            <ActionLink label={t('postCheckin.viewRoomAccess')} onClick={onViewRoomAccess} />
            {baseBooking?.stay?.hours && <ActionLink label={t('postCheckin.extendStay')} onClick={onExtendStay} />}
          </div>
        </div>
      </main>

      <div className="px-4 pb-6">
        <div className="mx-auto w-full max-w-[420px] md:max-w-[720px]">
          <Button
            variant="outline"
            onClick={onCheckout}
            className="w-full border-red-500 text-red-500 hover:bg-red-50"
          >
            {t('buttons.checkout')}
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PostCheckinDetailsScreen;
