// src/components/screens/ReservationDetailsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Booking } from '../../types';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Button from '../ui/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { apiService } from '../../services/apiService';
import { useNavigate, useLocation } from 'react-router-dom';
import { CloudIcon, EditIcon, LocationIcon, PhoneIcon } from '../icons/Icons';

interface ReservationDetailsScreenProps {
  booking?: Booking | null;
  token?: string | null;
  onConfirm: (payload: {
    bookingId: number;
    mainGuestName?: string;
    email?: string;
    booking: Booking;
  }) => void;

  onBack: () => void;
  onShowPrivacyPolicy: () => void;
}

/* --- styles & small helpers --- */
const detailRowStyles = {
  container: 'py-2 flex flex-col gap-1',
  label: 'block text-xs font-semibold text-gray-900',
  value: 'block text-xs text-gray-800',
  justifiedEnd: 'py-2',
};

const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className={detailRowStyles.container}>
    <span className={detailRowStyles.label}>{label}</span>
    <span className={detailRowStyles.value}>{value ?? '-'}</span>
  </div>
);

const styles = {
  container: 'flex flex-col min-h-screen bg-white',
  main: 'flex-grow px-6 pb-6 pt-3 space-y-3',
  title: 'text-xs font-bold tracking-[0.22em] text-gray-900',
  detailsCard: 'bg-white p-0 max-w-[360px] md:max-w-[600px] lg:max-w-[720px] mx-auto w-full',
  divider: 'space-y-1',
  brand: 'flex flex-col items-center gap-1 pt-1',
  brandText: 'text-3xl md:text-4xl font-bold tracking-widest text-gray-900',
  titleRow: 'flex items-center justify-between max-w-[360px] md:max-w-[600px] lg:max-w-[720px] mx-auto w-full',
  titleIcons: 'flex items-center gap-3 text-gray-500',
  iconButton:
    'inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-black hover:border-gray-300 transition-colors',
  iconButtonDisabled:
    'inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-100 text-gray-300 cursor-not-allowed',
  statusPill:
    'inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-[11px] font-semibold',
  footer:
    'px-6 pb-6 pt-2 bg-white',
  helpRow: 'flex items-center gap-3 justify-center mt-3',
  inputLike:
    'mt-1 flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900',
  confirmButton: 'rounded-md py-3 text-xs tracking-[0.2em]',
  confirmWrap: 'max-w-[360px] md:max-w-[600px] lg:max-w-[720px] mx-auto w-full',
  statusWrap: 'max-w-[360px] md:max-w-[600px] lg:max-w-[720px] mx-auto w-full',
  consentBox: 'max-w-[360px] md:max-w-[600px] lg:max-w-[720px] mx-auto w-full p-3 text-xs text-gray-700',
  consentRow: 'mt-3 flex items-start gap-2 text-[11px] text-gray-800',
  consentLink: 'text-gray-900 underline underline-offset-2',
};

/* safe getter that supports dotted paths */
const safeGetString = (obj: any, ...keys: (string | number)[]) => {
  if (!obj) return undefined;
  for (const k of keys) {
    if (k === undefined || k === null) continue;
    try {
      if (typeof k === 'string' && (k.includes('.') || k.includes('?.'))) {
        const path = String(k).replace(/\?\./g, '.').split('.');
        let cur = obj;
        let ok = true;
        for (const part of path) {
          if (cur == null) {
            ok = false;
            break;
          }
          if (typeof cur !== 'object' || !(part in cur)) {
            ok = false;
            break;
          }
          cur = cur[part as any];
        }
        if (
          ok &&
          cur !== undefined &&
          cur !== null &&
          String(cur).trim() !== ''
        )
          return String(cur);
        continue;
      }
      const v = obj[k as any];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
    } catch {
      continue;
    }
  }
  return undefined;
};

/* --- map backend booking to UI (includes rooms array) --- */
const mapBackendBookingToUi = (raw: any) => {
  if (!raw) return null;

  const b = raw?.data ?? raw?.booking ?? raw?.payload ?? raw;

  let rooms: Array<any> = [];

  if (Array.isArray(b?.rooms) && b.rooms.length > 0) {
    rooms = b.rooms.map((r: any) => ({
      bookingInfoId: r.bookingInfoId ?? r.id ?? r.booking_info_id,
      roomNumber:
        r.roomNumber ??
        r.room_number ??
        r.number ??
        (r.room && r.room.roomNumber) ??
        '',
      roomType:
        r.roomType ?? r.type ?? (r.room && (r.room.type || r.room.name)) ?? '',
      roomDetails: r.roomDetails ?? r.details ?? r.room ?? {},
    }));
  } else {
    const singleNum = b.roomNumber ?? b.room?.roomNumber ?? b.room_number ?? '';
    const singleType = b.roomType ?? b.room?.type ?? b.room?.name ?? '';
    if (singleNum || singleType) {
      rooms.push({
        bookingInfoId: b.bookingInfoId ?? b.booking_info_id ?? undefined,
        roomNumber: singleNum,
        roomType: singleType,
        roomDetails: b.roomDetails ?? b.room ?? {},
      });
    }
  }

  // ✅ normalize accompanyingGuests (รองรับ string / array)
  let accompanyingGuests: any[] = [];
  const rawAcc =
    b?.accompanyingGuests ??
    b?.accompanying_guests ??
    b?.guest_list ??
    b?.guestList;

  if (Array.isArray(rawAcc)) accompanyingGuests = rawAcc;
  else if (typeof rawAcc === 'string') {
    try {
      const parsed = JSON.parse(rawAcc);
      accompanyingGuests = Array.isArray(parsed) ? parsed : [];
    } catch {
      accompanyingGuests = [];
    }
  }

  const adults =
    Number(b?.adults ?? b?.guests?.adults ?? b?.guestCounts?.adults ?? 0) || 0;
  const children =
    Number(
      b?.children ?? b?.guests?.children ?? b?.guestCounts?.children ?? 0
    ) || 0;

  const mapped: any = {
    id: b.bookingId ?? b.booking_id ?? b.id ?? undefined,
    dbId: b.bookingId ?? b.booking_id ?? b.id ?? undefined,
    mainGuest: b.guestLastName ?? b.guestName ?? b.mainGuest ?? b.name ?? '',
    email: b.guestEmail ?? b.email ?? '',
    stay: {
      from: b.checkInDate ?? b.checkIn ?? b.from ?? '',
      to: b.checkOutDate ?? b.checkOut ?? b.to ?? '',
      nights: b.numberOfNights ?? b.stay?.nights ?? undefined,
      hours: b.numberOfHours ?? b.stay?.hours ?? undefined,
    },
    rooms,
    guests: { adults, children },
    accompanyingGuests,
    confirmationCode: b.bookingInfoId ?? b.referenceCode ?? '',
    status: b.status ?? undefined,
    raw: b,
  };

  return mapped;
};

/* --- helper: detect already checked-in across shapes --- */
const isAlreadyCheckedIn = (raw: any) => {
  if (!raw) return false;
  const b = raw?.data ?? raw?.booking ?? raw;

  const infoStatusRaw =
    b?.bookingInfoStatus ??
    b?.booking_info_status ??
    raw?.bookingInfoStatus ??
    raw?.booking_info_status ??
    null;
  if (infoStatusRaw) {
    return String(infoStatusRaw).toLowerCase() === 'completed';
  }

  const status = (b?.status ?? raw?.status ?? '').toString().toLowerCase();
  if (
    status.includes('already_checked_in') ||
    status.includes('checked-in') ||
    status.includes('checkedin')
  )
    return true;

  if (b?.checkedInAt || b?.checked_in_at) return true;

  if (raw?.alreadyCheckedIn === true || b?.alreadyCheckedIn === true) return true;

  return false;
};

/* ------------------ Helper: initiateWithGuard (in-flight + cache w/ TTL) ------------------ */
const INIT_TTL_MS = 10 * 60 * 1000; // 10 นาที

const initiateWithGuard = async (bookingId: number) => {
  const keyInFlight = `initiate_inflight_${bookingId}`;
  const keyCache = `initiate_cache_${bookingId}`;

  // Try cached result (localStorage) with TTL
  try {
    const cached = localStorage.getItem(keyCache);
    if (cached) {
      const parsed = JSON.parse(cached);
      const ts = Number(parsed?.__ts ?? 0);
      const fresh = ts && Date.now() - ts < INIT_TTL_MS;
      if (
        fresh &&
        parsed &&
        (parsed.token || parsed.checkin_code || parsed.id || parsed.data?.token)
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[initiateWithGuard] cache read failed', e);
  }

  // Prevent concurrent calls in same tab
  if (sessionStorage.getItem(keyInFlight)) {
    try {
      const cached = localStorage.getItem(keyCache);
      if (cached) return JSON.parse(cached);
    } catch { }
    throw new Error('initiation_in_progress');
  }

  sessionStorage.setItem(keyInFlight, '1');
  try {
    const init = await apiService.initiateCheckIn(bookingId);
    try {
      const roomId =
        init?.bookingRoomId ??
        init?.booking_room_id ??
        init?.data?.bookingRoomId ??
        init?.data?.booking_room_id ??
        init?.items?.[0]?.bookingRoomId ??
        init?.items?.[0]?.booking_room_id ??
        init?.data?.items?.[0]?.bookingRoomId ??
        init?.data?.items?.[0]?.booking_room_id ??
        null;
      if (roomId && /^\d+$/.test(String(roomId))) {
        localStorage.setItem("checkin_booking_room_id", String(roomId));
      }
    } catch {
      // ignore
    }
    try {
      const payload = { ...init, __ts: Date.now() };
      localStorage.setItem(keyCache, JSON.stringify(payload));
    } catch (e) {
      console.warn('[initiateWithGuard] cache write failed', e);
    }
    return init;
  } catch (e) {
    // ถ้า initiate fail ให้ clear cache กัน token เก่าค้าง
    try {
      localStorage.removeItem(keyCache);
    } catch { }
    throw e;
  } finally {
    sessionStorage.removeItem(keyInFlight);
  }
};

/* ------------------ Helper: ensure token (if numeric => call initiateWithGuard) ------------------ */
async function ensureRealTokenIfNumeric(
  maybeTokenOrId: string | null | undefined,
  options?: { includeBooking?: boolean }
): Promise<{ token: string | null; booking?: any }> {
  if (!maybeTokenOrId) return { token: null };
  const s = String(maybeTokenOrId).trim();
  if (s === '') return { token: null };

  // token เป็นเลขล้วน -> ถือว่าเป็น bookingId
  if (/^\d+$/.test(s)) {
    if (options?.includeBooking) {
      try {
        const booking = await apiService.getBookingByToken(s);
        if (booking) return { token: s, booking };
      } catch {
        // ignore and fallback to initiate
      }
    }
    try {
      const init = await initiateWithGuard(Number(s));
      const token =
        init?.token ??
        init?.data?.token ??
        init?.checkin_code ??
        init?.checkinCode ??
        init?.token_value ??
        null;

      return { token: token ? String(token) : null };
    } catch (e) {
      console.warn('[ensureRealTokenIfNumeric] initiateWithGuard failed', e);
      return { token: null };
    }
  }

  return { token: s };
}

/* --- main component --- */
const ReservationDetailsScreen: React.FC<ReservationDetailsScreenProps> = ({
  booking: initialBooking = null,
  token: propToken = null,
  onConfirm,
  onBack,
  onShowPrivacyPolicy,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [booking, setBooking] = useState<any>(
    initialBooking ? mapBackendBookingToUi(initialBooking) : null
  );

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [tokenUsed, setTokenUsed] = useState<string | null>(
    propToken ?? (location.state as any)?.token ?? localStorage.getItem('checkin_token')
  );

  // ✅ sync token from props / navigation state if changed
  useEffect(() => {
    const next =
      propToken ?? (location.state as any)?.token ?? localStorage.getItem('checkin_token');

    if (next && String(next) !== String(tokenUsed ?? '')) {
      setTokenUsed(String(next));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propToken, location.state]);

  useEffect(() => {
    if (booking) return;

    if (!tokenUsed) {
      setFetchError(t('reservationDetails.missingToken') || 'Token not found for check-in.');
      return;
    }

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setFetchError(null);

        // Ensure real token (if numeric id was passed)
        const resolved = await ensureRealTokenIfNumeric(tokenUsed, { includeBooking: true });
        const realToken = resolved.token;

        if (!realToken) {
          // fallback: if numeric, try fetchGuests by id to at least show minimal info
          const looksNumeric = typeof tokenUsed === 'string' && /^\d+$/.test(tokenUsed);
          if (looksNumeric) {
            try {
              const guests = await apiService.fetchGuests(Number(tokenUsed)).catch(() => null);
              if (guests && guests.length > 0) {
                const payload = {
                  bookingId: Number(tokenUsed),
                  guestLastName:
                    guests[0]?.details?.lastName ?? guests[0]?.fullName ?? undefined,
                  guestEmail: guests[0]?.email ?? undefined,
                  rooms: guests.map((_: any, idx: number) => ({
                    bookingInfoId: `${tokenUsed}-${idx}`,
                  })),
                };
                if (mounted) setBooking(mapBackendBookingToUi(payload));
                return;
              }
            } catch {
              // ignore
            }
          }
          throw new Error(
            t('reservationDetails.invalidTokenOrId') ||
            'Unable to verify check-in link (invalid token/bookingId).'
          );
        }

        const b = resolved.booking ?? (await apiService.getBookingByToken(realToken));

        // ✅ ถ้าเช็คอินเสร็จแล้ว → ไป PostCheckin
        if (isAlreadyCheckedIn(b)) {
          const normalized = mapBackendBookingToUi(b);
          if (mounted) setBooking(normalized);
          navigate('/post-checkin', { state: { booking: normalized } });
          return;
        }

        if (mounted) {
          const normalized = mapBackendBookingToUi(b);
          setBooking(normalized);
          if (realToken !== tokenUsed) setTokenUsed(realToken);
        }
      } catch (err: any) {
        if (mounted) {
          setFetchError(
            err?.message ?? (t('reservationDetails.fetchError') || 'Failed to load booking details.')
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [tokenUsed, t, booking, navigate]);

  // helpers
  const parseDate = (v?: string | null): Date | null => {
    if (!v) return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatDateTime = (v?: string | null): string => {
    const d = parseDate(v);
    if (!d) return String(v ?? '') || '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateOnly = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (d.getHours() === 0 && d.getMinutes() === 0) return dateOnly;
    return `${dateOnly}, ${time}`;
  };

  const deriveDuration = (fromStr?: string | null, toStr?: string | null) => {
    if (booking?.stay?.hours) {
      return {
        label: t('reservationDetails.hours') || 'Hours',
        value: `${booking.stay.hours} ${t('reservationDetails.hours') || 'Hours'}`,
      };
    }
    if (booking?.stay?.nights || booking?.stay?.nights === 0) {
      return {
        label: t('reservationDetails.nights') || 'Nights',
        value: `${booking.stay.nights}`,
      };
    }

    const fromDate = parseDate(fromStr ?? undefined);
    const toDate = parseDate(toStr ?? undefined);
    if (fromDate && toDate) {
      const diffMs = Math.abs(toDate.getTime() - fromDate.getTime());
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      if (diffHours < 24) {
        return {
          label: t('reservationDetails.hours') || 'Hours',
          value: `${diffHours} ${t('reservationDetails.hours') || 'Hours'}`,
        };
      }
      return {
        label: t('reservationDetails.nights') || 'Nights',
        value: `${diffDays}`,
      };
    }

    return { label: t('reservationDetails.nights') || 'Nights', value: '' };
  };

  const from =
    booking?.stay?.from ??
    (booking as any)?.stay?.From ??
    (booking as any)?.from ??
    (booking as any)?.checkIn ??
    (booking as any)?.CheckIn ??
    (booking as any)?.checkin ??
    '';

  const to =
    booking?.stay?.to ??
    (booking as any)?.stay?.To ??
    (booking as any)?.to ??
    (booking as any)?.checkOut ??
    (booking as any)?.CheckOut ??
    (booking as any)?.checkout ??
    '';

  const fromFormatted = useMemo(() => formatDateTime(from), [from]);
  const toFormatted = useMemo(() => formatDateTime(to), [to]);

  const duration = useMemo(() => deriveDuration(from, to), [from, to, booking, t]);
  const durationLabel = duration.label;
  const durationValue = duration.value;

  const mainGuest =
    safeGetString(booking, 'mainGuest', 'guestName', 'customerName', 'customer', 'name') ?? '';

  const email = safeGetString(booking, 'email', 'customerEmail', 'guestEmail', 'guest.email', 'customer?.email') ?? '';

  // rooms list
  const rooms = booking?.rooms ?? [];
  const roomsCount = Array.isArray(rooms) ? rooms.length : 0;
  const roomType =
    (roomsCount > 0
      ? rooms[0]?.roomType ?? rooms[0]?.type ?? rooms[0]?.roomDetails?.typeName
      : undefined) ??
    safeGetString(
      booking,
      'roomType',
      'raw.roomType',
      'raw.room_type',
      'raw.room?.type',
      'raw.room?.name'
    ) ??
    '';
  const roomChargeRaw = safeGetString(
    booking,
    'roomCharge',
    'raw.roomCharge',
    'raw.room_charge',
    'raw.totalCharge',
    'raw.totalAmount',
    'raw.amount'
  );
  const roomChargeText = roomChargeRaw
    ? /[a-zA-Z]/.test(String(roomChargeRaw))
      ? String(roomChargeRaw)
      : `THB ${roomChargeRaw}`
    : '';
  const statusText = isAlreadyCheckedIn(booking?.raw ?? booking)
    ? t('postCheckin.status') || 'Checked In'
    : t('reservationDetails.checkInPending') || 'Check-in Pending';

  // ✅ Confirm: ensure token is real token (if numeric => initiate)
 const handleConfirm = async () => {
  if (loading) return;

  const maybeBookingId = booking?.dbId ?? booking?.id ?? booking?.raw?.bookingId ?? booking?.raw?.id;

  if (!maybeBookingId || isNaN(Number(maybeBookingId))) {
    setFetchError(t('reservationDetails.missingBookingId') || 'BookingId not found. Please go back.');
    return;
  }

  if (!tokenUsed) {
    setFetchError(t('reservationDetails.missingToken') || 'Token not found for check-in.');
    return;
  }

  setLoading(true);
  try {
    const resolved = await ensureRealTokenIfNumeric(tokenUsed, { includeBooking: true });
    const realToken = resolved.token;
    if (!realToken) {
      setFetchError(
        t('reservationDetails.invalidTokenOrId') ||
        'Unable to verify check-in link (invalid token/bookingId).'
      );
      return;
    }

    setTokenUsed(realToken);
    localStorage.setItem('checkin_token', realToken);

    const payload = {
      bookingId: Number(maybeBookingId),
      mainGuestName: mainGuest,
      email: email,
      booking,
    };

    onConfirm(payload);

  } catch (e: any) {
    setFetchError(e?.message ?? (t('reservationDetails.confirmError') || 'Confirm failed.'));
  } finally {
    setLoading(false);
  }
};

  const handleOpenEnterCode = () => {
    setBooking(null);
    setTokenUsed(null);
    setFetchError(null);
    setAgreed(false);
    onBack();
  };

  return (
    <div className={styles.container}>
      <Header onBack={onBack} compact showLogo={false} showBorder={false} />
      <main className={styles.main}>
        <div className={styles.brand}>
          <CloudIcon className="w-32 h-32 md:w-36 md:h-36" />
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{t('reservationDetails.title') || 'Reservation Details'}</h1>
          <div className={styles.titleIcons} aria-hidden="true">
            <button
              type="button"
              className={styles.iconButtonDisabled}
              title="Hotel address not set"
              aria-label="Map unavailable"
            >
              <LocationIcon className="w-4 h-4" />
            </button>
            <a
              className={styles.iconButton}
              href="tel:0932035150"
              aria-label="Call hotel"
              title="Call 0932035150"
            >
              <PhoneIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
        {booking && (
          <div className={styles.statusWrap}>
            <div className={styles.statusPill}>{statusText}</div>
          </div>
        )}

        <div className={styles.detailsCard} role="region" aria-labelledby="reservation-details-heading">
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              {t('reservationDetails.loading') || 'Loading booking details…'}
            </div>
          ) : fetchError ? (
            <div className="py-6 text-center text-red-500" role="alert">
              <div>{fetchError}</div>
              <div className={styles.helpRow}>
                <Button
                  onClick={() => {
                    setFetchError(null);
                    setBooking(null);
                    setTokenUsed(null);
                    setAgreed(false);
                  }}
                >
                  {t('reservationDetails.retry') || 'Retry'}
                </Button>
                <Button onClick={handleOpenEnterCode} variant="outline">
                  {t('reservationDetails.enterCodeManually') || 'Enter code manually'}
                </Button>
              </div>
            </div>
          ) : !booking ? (
            <div className="py-6 text-center text-gray-500">
              {t('reservationDetails.noBookingFound') || 'No booking found. Please check your code or link.'}
              <div className={styles.helpRow}>
                <Button onClick={handleOpenEnterCode} variant="outline">
                  {t('reservationDetails.enterCodeManually') || 'Enter code manually'}
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.divider}>
              <div className={detailRowStyles.container}>
                <div className={detailRowStyles.label}>
                  {t('reservationDetails.mainGuest') || 'Main Guest'}
                </div>
                <div className={styles.inputLike}>
                  <span>{mainGuest ?? booking?.mainGuest ?? '-'}</span>
                  <EditIcon className="w-4 h-4 text-gray-500" />
                </div>
              </div>

              <DetailRow
                label={t('reservationDetails.email') || 'Email'}
                value={email ?? booking?.email ?? '-'}
              />

              <DetailRow
                label={t('reservationDetails.numGuests') || 'Number of Guests'}
                value={
                  t('reservationDetails.numGuestsValue', {
                    adults: booking?.guests?.adults ?? 0,
                    children: booking?.guests?.children ?? 0,
                  }) ||
                  `${booking?.guests?.adults ?? 0} Adult(s), ${booking?.guests?.children ?? 0} Child(ren)`
                }
              />

              <DetailRow
                label={t('reservationDetails.stayDuration') || 'Stay Duration'}
                value={
                  <div className="space-y-1">
                    <div>{`${t('reservationDetails.from') || 'From'} ${fromFormatted}`}</div>
                    <div>{`${t('reservationDetails.to') || 'To'} ${toFormatted}`}</div>
                  </div>
                }
              />

              <DetailRow
                label={durationLabel || 'Nights/Hours'}
                value={
                  durationValue
                    ? durationLabel === (t('reservationDetails.nights') || 'Nights')
                      ? `${durationValue} ${t('reservationDetails.nightsLabel') || 'Nights'}`
                      : durationValue
                    : ''
                }
              />

              {roomType && (
                <DetailRow
                  label={t('reservationDetails.roomType') || 'Room Type'}
                  value={roomType}
                />
              )}

              {roomChargeText && (
                <DetailRow
                  label={t('reservationDetails.roomCharge') || 'Room Charge'}
                  value={roomChargeText}
                />
              )}

              {/* ✅ Accompanying Guests */}
              {Array.isArray(booking?.accompanyingGuests) && booking.accompanyingGuests.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm text-gray-700 font-medium">
                    {t('reservationDetails.accompanyingGuestsCount', {
                      count: booking.accompanyingGuests.length,
                    }) ||
                      `${t('reservationDetails.accompanyingGuests') || 'Accompanying Guests'}: ${booking.accompanyingGuests.length
                      }`}
                  </div>

                  <ul className="mt-2 list-disc list-inside text-gray-800" aria-label="accompanying-guests-list">
                    {booking.accompanyingGuests.map((g: any, idx: number) => {
                      const name = g?.name ?? g?.fullName ?? g?.guestName ?? '';
                      const type = g?.type ?? g?.guestType ?? '';
                      return (
                        <li key={String(g?.id ?? idx)} className="mt-1">
                          {name
                            ? name
                            : t('reservationDetails.guestNumber', { number: idx + 2 }) || `Guest ${idx + 2}`}
                          {type ? ` (${type})` : ''}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {roomsCount > 1 && (
                <div className="mt-4">
                  <div className="text-sm text-gray-700 font-medium">
                    {t('reservationDetails.rooms')
                      ? `${t('reservationDetails.rooms')}: ${roomsCount}`
                      : `Rooms: ${roomsCount}`}
                  </div>

                  <ul className="mt-2 list-disc list-inside text-gray-800" aria-label="rooms-list">
                    {rooms.map((r: any, idx: number) => {
                      const num = r.roomNumber ?? r.room_number ?? r.number ?? '';
                      const typ = r.roomType ?? r.type ?? r.roomDetails?.typeName ?? '';
                      return (
                        <li key={String(r.bookingInfoId ?? num ?? idx)} className="mt-1">
                          {num ? `${num}` : `#${idx + 1}`}
                          {typ ? ` (${typ})` : ''}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      <div className={styles.footer}>
        <div className={styles.consentBox}>
          <div
            dangerouslySetInnerHTML={{
              __html: t('privacyPolicy.intro') || '',
            }}
          />
          <label className={styles.consentRow}>
            <input
              type="checkbox"
              className="mt-0.5 h-3 w-3"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              {t('reservationDetails.agreement') || 'I agree to the privacy policy.'}{' '}
              <button
                type="button"
                onClick={onShowPrivacyPolicy}
                className={styles.consentLink}
              >
                {t('reservationDetails.readDetails') || 'Read details'}
              </button>
            </span>
          </label>
        </div>
        <div className={styles.confirmWrap}>
          <Button
            onClick={() => void handleConfirm()}
            disabled={!agreed || !booking || !tokenUsed || loading}
            className={styles.confirmButton}
          >
            {loading ? (t('buttons.processing') || 'Processing…') : (t('buttons.confirm') || 'Confirm')}
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ReservationDetailsScreen;
