import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Screen, Booking, Guest, DocumentType, ExtractedData } from './types';

import { useTranslation } from './hooks/useTranslation';
import { apiService } from './services/apiService';
import { normalizeDateString } from './services/api.helpers';

// Screen Components
import WelcomeScreen from './components/screens/WelcomeScreen';
import EnterCodeScreen from './components/screens/EnterCodeScreen';
import ReservationDetailsScreen from './components/screens/ReservationDetailsScreen';
import GuestListScreen from './components/screens/GuestListScreen';
import FaceCaptureScreen from './components/screens/FaceCaptureScreen';
import DocumentTypeScreen from './components/screens/DocumentTypeScreen';
import DocumentCaptureScreen from './components/screens/DocumentCaptureScreen';
import CheckinCompleteScreen from './components/screens/CheckinCompleteScreen';
import CheckoutScreen from './components/screens/CheckoutScreen';
import PrivacyPolicyScreen from './components/screens/PrivacyPolicyScreen';

import PostCheckinDetailsScreen from './components/screens/PostCheckinDetailsScreen';
import RoomAccessInformationScreen from './components/screens/RoomAccessInformationScreen';
import CheckoutSuccessScreen from './components/screens/CheckoutSuccessScreen';
import ExtendStayScreen from './components/screens/ExtendStayScreen';
import { loadGuestCache, mergeGuestsPreferCache, saveGuestCache } from "./utils/guestCache";

import { checkoutBooking } from './services/api.bookings';

const extractBookingId = (b: any): number | undefined => {
  const v =
    b?.dbId ??
    b?.id ??
    b?.bookingId ??
    b?.booking_id;

  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const HIDE_RESERVATION_PAGE = (import.meta.env.VITE_HIDE_RESERVATION_PAGE as string) === 'true';
const HIDE_REVIEW_PAGE = (import.meta.env.VITE_HIDE_REVIEW_PAGE as string) === 'true';

const mapBackendGuestToUi = (g: any, idx: number): Guest => {
  const stableId =
    g.guestId ?? g.guest_id ?? g.customer_id ?? g.customerId ?? g.person_id ?? g.personId ?? g.id;

  const id = String(stableId ?? idx);

  const isMainGuest =
    (g.isMainGuest === true) ||
    (g.is_main_guest === true) ||
    (g.main_guest === true);

  const firstName = g.details?.firstName ?? g.first_name ?? g.firstName ?? '';
  const lastName = g.details?.lastName ?? g.last_name ?? g.lastName ?? '';

  const name =
    (g.full_name ?? g.fullName ?? g.name ?? `${firstName} ${lastName}`)
      ?.toString()
      .trim() || `Guest ${idx + 1}`;

  const faceImage = g.faceImage ?? g.face_image ?? g.face_image_base64 ?? '';
  const documentImage = g.documentImage ?? g.document_image ?? g.document_image_base64 ?? '';

  const docTypeRaw = (g.documentType ?? g.id_type ?? '').toString().toUpperCase();
  const documentType =
    docTypeRaw.includes('PASSPORT') ? DocumentType.Passport :
      docTypeRaw.includes('ID') ? DocumentType.IDCard :
        (g.documentType ?? DocumentType.IDCard);

  return {
    id,
    name,
    isMainGuest,
    documentType,
    details: {
      ...(g.details || {}),
      firstName,
      lastName,
      gender: g.details?.gender ?? g.gender ?? '',
      nationality: g.details?.nationality ?? g.nationality ?? '',
      dateOfBirth: g.details?.dateOfBirth ?? g.date_of_birth ?? g.dateOfBirth ?? '',
      documentNumber: g.details?.documentNumber ?? g.id_number ?? g.documentNumber ?? '',
      currentAddress: g.details?.currentAddress ?? g.current_address ?? g.currentAddress ?? '',
    },
    faceImage,
    documentImage,
    progress:
      typeof g.progress === 'number'
        ? g.progress
        : (faceImage && documentImage ? 100 : (faceImage ? 50 : 0)),
  } as Guest;
};

// ✅ เลือก record "ดีที่สุด" ต่อ 1 คน (กันซ้ำ/กัน record เก่ามาทับ)
const normalizeGuestsForDisplay = (list: Guest[]) => {
  const buckets = new Map<string, Guest>();

  const makeKey = (g: Guest) => {
    const doc = String(g.details?.documentNumber ?? '').trim();
    const fn = String(g.details?.firstName ?? '').trim();
    const ln = String(g.details?.lastName ?? '').trim();
    const dob = String(g.details?.dateOfBirth ?? '').trim();
    const name = String(g.name ?? '').trim();

    // ลำดับความเสถียรของ key
    if (doc) return `DOC:${doc}`;
    if ((fn || ln) && dob) return `NDO:${fn}|${ln}|${dob}`;
    if (name) return `NAME:${name}`;
    return `FALLBACK:${String(g.id ?? '')}`;
  };

  const score = (g: Guest) => {
    // คะแนนมากกว่า = ข้อมูลครบกว่า
    const fn = String(g.details?.firstName ?? '').trim();
    const ln = String(g.details?.lastName ?? '').trim();
    const doc = String(g.details?.documentNumber ?? '').trim();
    const nat = String(g.details?.nationality ?? '').trim();
    const gender = String(g.details?.gender ?? '').trim();
    const dob = String(g.details?.dateOfBirth ?? '').trim();
    const addr = String((g.details as any)?.currentAddress ?? '').trim();

    const hasFace = g.faceImage ? 1 : 0;
    const hasDocImg = g.documentImage ? 1 : 0;

    return (
      (fn ? 2 : 0) +
      (ln ? 2 : 0) +
      (doc ? 2 : 0) +
      (dob ? 1 : 0) +
      (nat ? 1 : 0) +
      (gender ? 1 : 0) +
      (addr ? 1 : 0) +
      hasFace +
      hasDocImg +
      (g.progress ?? 0) // ใช้ progress ช่วยตัดสิน
    );
  };

  for (const g of list) {
    const key = makeKey(g);
    const prev = buckets.get(key);
    if (!prev) {
      buckets.set(key, g);
      continue;
    }

    // main guest ให้ความสำคัญมากกว่า
    if (!prev.isMainGuest && g.isMainGuest) {
      buckets.set(key, g);
      continue;
    }

    // เลือกตัวที่คะแนนสูงกว่า
    if (score(g) > score(prev)) {
      buckets.set(key, g);
    }
  }

  const result = Array.from(buckets.values());
  result.sort((a, b) => Number(b.isMainGuest) - Number(a.isMainGuest));
  return result;
};

const App: React.FC = () => {
  const SCREEN_STORAGE_KEY = "current_screen";
  const [screen, setScreen] = useState<Screen>(() => {
    try {
      const stored = localStorage.getItem(SCREEN_STORAGE_KEY) as Screen | null;
      if (stored && Object.values(Screen).includes(stored)) {
        return stored;
      }
    } catch {
      // ignore storage errors
    }
    return Screen.Welcome;
  });
  const [booking, setBooking] = useState<Booking | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [isGuestListReadOnly, setIsGuestListReadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkinToken, setCheckinToken] = useState<string | null>(null);
  const [guestListBookingId, setGuestListBookingId] = useState<number | null>(null);
  const CHECKIN_BOOKING_ID_KEY = "checkin_booking_id";

  const { t } = useTranslation();

  const navigateTo = useCallback((newScreen: Screen) => {
    setError(null);
    setScreen(newScreen);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SCREEN_STORAGE_KEY, String(screen));
    } catch {
      // ignore storage errors
    }
  }, [screen]);

  // handle code/token submission -> load booking + guests
  const handleCodeSubmit = async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // ✅ 1) เคส EnterCodeScreen ส่ง "ALREADY_CHECKEDIN"
      if (token === "ALREADY_CHECKEDIN") {
        const raw = localStorage.getItem("checkedin_booking");
        if (!raw) throw new Error("checkedin_booking not found");

        const bk = JSON.parse(raw);

        const safeBooking: Booking = {
          ...bk,
          dbId: extractBookingId(bk),

          mainGuest:
            bk?.mainGuest ??
            bk?.mainGuestName ??
            bk?.guestName ??
            bk?.customerName ??
            bk?.guestLastName ??
            bk?.main_guest?.full_name ??
            bk?.main_guest?.name ??
            bk?.customer?.full_name ??
            bk?.customer?.name ??
            "",
          email:
            bk?.email ??
            bk?.guestEmail ??
            bk?.guest_email ??
            bk?.customerEmail ??
            bk?.customer_email ??
            bk?.main_guest?.email ??
            bk?.customer?.email ??
            bk?.guest?.email ??
            "",

          guests: bk?.guests ?? { adults: 0, children: 0 },
          rooms: Array.isArray(bk?.rooms) ? bk.rooms : [],
          stay: bk?.stay ?? {
            from: bk?.checkIn ?? bk?.check_in ?? "",
            to: bk?.checkOut ?? bk?.check_out ?? "",
          },
        };

        // ✅ สำคัญ: ตั้ง token จริง (ห้ามตั้งเป็น "ALREADY_CHECKEDIN")
        const realToken =
          localStorage.getItem("checkin_token") ||
          bk?.token ||
          bk?.checkin_token ||
          null;

        if (realToken) setCheckinToken(String(realToken));

        setBooking(safeBooking);
        setIsGuestListReadOnly(true);
        // ✅ สำคัญ: token ต้องเป็น token จริง
        if (realToken) {
          setCheckinToken(String(realToken));
          localStorage.setItem("checkin_token", String(realToken));
        }

        // ✅ สำคัญ: โหลด guests จริง เพื่อให้ email/mainGuest แสดงได้
        const bid = extractBookingId(safeBooking);
        if (bid) {
          try {
            const resp: any = await apiService.fetchGuests(bid);
            const list = resp?.data ?? resp?.guests ?? resp ?? [];
            const rawGuests = Array.isArray(list) ? list : [];
            const uiGuests = rawGuests.map((g: any, idx: number) =>
              mapBackendGuestToUi(g, idx)
            );

            const cached = loadGuestCache(bid);
            const merged = mergeGuestsPreferCache(uiGuests, cached);

            setGuests(normalizeGuestsForDisplay(merged));
          } catch {
            setGuests(normalizeGuestsForDisplay(loadGuestCache(bid)));
          }
        } else {
          setGuests([]);
        }

        localStorage.setItem("checkedin_booking", JSON.stringify(safeBooking));
        navigateTo(Screen.PostCheckinDetails);
        return;
      }

      // ✅ 2) เคสปกติ: ได้ token จริง
      setCheckinToken(token);
      localStorage.setItem("checkin_token", token);

      const bkResp: any = await apiService.getBookingByToken(token);
      const bk: any =
        bkResp?.data?.booking ??
        bkResp?.data ??
        bkResp?.booking ??
        bkResp;

      console.log("🔥 Booking from API =", bk);

      // ✅ 3) เคส “เช็คอินแล้ว” จาก API
      if (bk?.__alreadyCheckedIn) {
        const safeBooking: Booking = {
          ...bk,
          dbId: extractBookingId(bk),

          mainGuest:
            bk?.mainGuest ??
            bk?.mainGuestName ??
            bk?.guestName ??
            bk?.customerName ??
            bk?.main_guest?.full_name ??
            bk?.main_guest?.name ??
            bk?.customer?.full_name ??
            bk?.customer?.name ??
            "",
          email:
            bk?.email ??
            bk?.guestEmail ??
            bk?.guest_email ??
            bk?.customerEmail ??
            bk?.customer_email ??
            bk?.main_guest?.email ??
            bk?.customer?.email ??
            bk?.guest?.email ??
            "",

          guests: bk?.guests ?? { adults: 0, children: 0 },
          rooms: Array.isArray(bk?.rooms) ? bk.rooms : [],
          stay: bk?.stay ?? {
            from: bk?.checkIn ?? bk?.check_in ?? "",
            to: bk?.checkOut ?? bk?.check_out ?? "",
          },
        };

        setBooking(safeBooking);
        setIsGuestListReadOnly(true);
        setCheckinToken(token);
        localStorage.setItem("checkin_token", token);

        // ✅ สำคัญ: ห้าม setGuests([]) ทิ้ง ต้องโหลด guests
        const bid = extractBookingId(safeBooking);
        if (bid) {
          try {
            const resp: any = await apiService.fetchGuests(bid);
            const list = resp?.data ?? resp?.guests ?? resp ?? [];
            const rawGuests = Array.isArray(list) ? list : [];
            const uiGuests = rawGuests.map((g: any, idx: number) =>
              mapBackendGuestToUi(g, idx)
            );
            const cached = loadGuestCache(bid);
            const merged = mergeGuestsPreferCache(uiGuests, cached);
            setGuests(normalizeGuestsForDisplay(merged));

          } catch {
            setGuests(normalizeGuestsForDisplay(loadGuestCache(bid)));

          }
        } else {
          setGuests([]);
        }

        localStorage.setItem("checkedin_booking", JSON.stringify(safeBooking));
        navigateTo(Screen.PostCheckinDetails);
        return;
      }

      // ✅ 4) ยังไม่เช็คอิน → flow เดิม
      if (!bk) throw new Error("booking not found");

      const bookingId = extractBookingId(bk);

      setBooking({
        ...bk,
        dbId: bookingId,
      });
      const guestsRaw = bookingId
        ? await apiService.fetchGuests(bookingId).catch(() => [])
        : [];

      if (!guestsRaw || guestsRaw.length === 0) {
        setGuests([
          {
            id: `guest_main_${Date.now()}`,
            name:
              (bk as any).mainGuestName ||
              (bk as any).guestName ||
              (bk as any).customerName ||
              " ",
            isMainGuest: true,
            progress: 0,
            documentType: DocumentType.IDCard,
          } as Guest,
        ]);
      } else {
        const uiGuests = guestsRaw.map((g: any, idx: number) =>
          mapBackendGuestToUi(g, idx)
        );
        const safeGuests = uiGuests.map((g, idx) => ({
          ...g,
          name: String(g.name ?? "").trim() ? g.name : `Guest ${idx + 1}`,
        }));
        setGuests(safeGuests);
      }

      navigateTo(Screen.ReservationDetails);
    } catch (err) {
      console.error("❌ handleCodeSubmit error =", err);
      setError(t("enterCode.errorMessage") ?? "Invalid token");
    } finally {
      setIsLoading(false);
    }
  };

  // --- auto-load token from URL on first mount ---
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const tokenFromUrl = q.get('token');
      const bookingIdFromUrl = q.get('bookingId');
      if (!tokenFromUrl && !bookingIdFromUrl) return;

      if (tokenFromUrl) {
        handleCodeSubmit(tokenFromUrl);
      } else if (bookingIdFromUrl && /^\d+$/.test(bookingIdFromUrl)) {
        const bid = Number(bookingIdFromUrl);
        (async () => {
          try {
            setIsLoading(true);
            setError(null);
            setIsGuestListReadOnly(true);
            setGuestListBookingId(bid);

            const bookingResp: any = await apiService.getBookingDetailsById(bid);
            const safeBooking: Booking = {
              ...(bookingResp as any),
              dbId: bid,
              stay: (bookingResp as any)?.stay ?? {
                from:
                  (bookingResp as any)?.checkIn ??
                  (bookingResp as any)?.check_in ??
                  '',
                to:
                  (bookingResp as any)?.checkOut ??
                  (bookingResp as any)?.check_out ??
                  '',
              },
            };
            setBooking(safeBooking);

            try {
              const resp: any = await apiService.fetchGuests(bid);
              const rawGuests = Array.isArray(resp) ? resp : (resp?.data ?? []);
              const uiGuests = rawGuests.map((g: any, idx: number) =>
                mapBackendGuestToUi(g, idx)
              );
              const cached = loadGuestCache(bid);
              const merged = mergeGuestsPreferCache(uiGuests, cached);
              setGuests(normalizeGuestsForDisplay(merged));
            } catch {
              const cached = loadGuestCache(bid);
              setGuests(normalizeGuestsForDisplay(cached));
            }

            navigateTo(Screen.PostCheckinDetails);
          } catch (e) {
            console.warn('[App] load by bookingId failed', e);
            setError('ไม่พบข้อมูลการจอง');
          } finally {
            setIsLoading(false);
          }
        })();
      }

      q.delete('token');
      q.delete('bookingId');
      const newSearch = q.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    } catch (e) {
      console.warn('Auto token load failed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const bookingId =
      extractBookingId(booking) ??
      (guestListBookingId ?? undefined) ??
      (() => {
        try {
          const raw = localStorage.getItem(CHECKIN_BOOKING_ID_KEY);
          const n = Number(raw);
          return Number.isNaN(n) ? undefined : n;
        } catch {
          return undefined;
        }
      })();
    const token = checkinToken ?? localStorage.getItem("checkin_token");

    const needsBooking = [
      Screen.GuestList,
      Screen.FaceCapture,
      Screen.DocumentType,
      Screen.DocumentCapture,
      Screen.CheckinComplete,
      Screen.PostCheckinDetails,
      Screen.RoomAccessInformation,
      Screen.ExtendStay,
      Screen.Checkout,
      Screen.CheckoutSuccess,
    ].includes(screen);

    if (needsBooking && !bookingId && !token) {
      setScreen(Screen.EnterCode);
    }
  }, [screen, booking, guestListBookingId, checkinToken]);

  // --- DEV: preview mode ---
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const preview = q.get('preview') || q.get('dev_preview');
      if (preview && preview.toLowerCase() === 'reservation' && !HIDE_RESERVATION_PAGE) {

        setScreen(Screen.ReservationDetails);
      }
    } catch {
      // ignore
    }
  }, []);

  // progress calculation
  const calculateProgress = (guest: Guest): number => {
    let progress = 0;
    if (guest.faceImage) progress += 50;
    if (guest.documentImage) progress += 10;

    if (guest.documentImage && guest.details) {
      let completedDetailFields = 0;
      const coreFields: (keyof ExtractedData)[] = [
        'firstName', 'lastName', 'documentNumber', 'nationality', 'gender', 'dateOfBirth',
      ];
      let allFields = [...coreFields];
      if (guest.documentType === DocumentType.IDCard) allFields.push('currentAddress');

      const totalRequired = allFields.length;
      allFields.forEach(field => {
        const v = guest.details?.[field as keyof ExtractedData];
        if (v && String(v).trim()) completedDetailFields++;
      });

      if (totalRequired > 0) progress += (completedDetailFields / totalRequired) * 40;
      else progress += 5;
    }

    return Math.min(100, Math.floor(progress));
  };

  // guest handlers
  const handleAddGuest = useCallback(() => {
    if (guests.length >= 5) return;
    const bid = extractBookingId(booking);
    setGuests(prev => {
      const next = [
        ...prev,
        {
          id: `guest_${Date.now()}`,
          name: t('guestList.newGuest') ?? 'New Guest',
          isMainGuest: false,
          progress: 0,
          documentType: DocumentType.IDCard,
        } as Guest,
      ];
      if (bid) saveGuestCache(bid, next);
      return next;
    });
  }, [guests.length, t]);

  const handleDeleteGuest = useCallback((guestId: string) => {
    const bid = extractBookingId(booking);
    setGuests(prev => {
      const next = prev.filter(g => g.id !== guestId);
      if (bid) saveGuestCache(bid, next);
      return next;
    });
  }, []);

  const handleUpdateGuestDetails = (guestId: string, details: Guest['details']) => {
    const bid = extractBookingId(booking);
    setGuests(prev => {
      const next = prev.map(g => {
        if (g.id !== guestId) return g;

        let finalName = g.name;
        const first = details?.firstName?.trim();
        const last = details?.lastName?.trim();

        if (first || last) finalName = [first, last].filter(Boolean).join(' ');

        const updated: Guest = { ...g, details, name: finalName };
        return { ...updated, progress: calculateProgress(updated) };
      });
      if (bid) saveGuestCache(bid, next);
      return next;
    });
  };

  const activeGuest = useMemo(
    () => guests.find(g => g.id === activeGuestId) ?? null,
    [guests, activeGuestId]
  );

  const handleFaceCapture = (photo: string) => {
    if (!activeGuestId) return;
    const bid = extractBookingId(booking);
    setGuests(prev => {
      const next = prev.map(g => {
        if (g.id === activeGuestId) {
          const updated: Guest = { ...g, faceImage: photo };
          return { ...updated, progress: calculateProgress(updated) };
        }
        return g;
      });
      if (bid) saveGuestCache(bid, next);
      return next;
    });
    navigateTo(Screen.GuestList);
  };

  const handleDocumentCapture = async (docImage: string, extractedData: ExtractedData) => {
    if (!activeGuestId || !documentType) return;

    const bid = extractBookingId(booking);
    setGuests(prev => {
      const next = prev.map(g => {
        if (g.id !== activeGuestId) return g;

        const rawDob =
          extractedData.dateOfBirth ??
          (extractedData as any).birthDate ??
          (extractedData as any).dob ??
          (extractedData as any).date_of_birth;

        const normalizedDateOfBirth = normalizeDateString(rawDob);
        const newDetails = {
          ...(g.details || {}),
          ...extractedData,
          dateOfBirth: normalizedDateOfBirth,
        };
        const createdKey = (bookingId: number, g: Guest) => {
          const doc = String(g.details?.documentNumber ?? '').trim();
          const fn = String(g.details?.firstName ?? '').trim();
          const ln = String(g.details?.lastName ?? '').trim();
          const name = String(g.name ?? '').trim();

          // key ที่เสถียรที่สุด
          const idPart =
            (doc && `DOC:${doc}`) ||
            ((fn || ln) && `NAME:${fn}|${ln}`) ||
            (name && `NAME:${name}`) ||
            `ID:${g.id}`;

          return `created_guest:${bookingId}:${idPart}`;
        };

        const wasCreated = (bookingId: number, g: Guest) => {
          try { return localStorage.getItem(createdKey(bookingId, g)) === '1'; }
          catch { return false; }
        };

        const markCreated = (bookingId: number, g: Guest) => {
          try { localStorage.setItem(createdKey(bookingId, g), '1'); }
          catch { }
        };

        let finalName = g.name;
        const firstName = newDetails.firstName?.trim();
        const lastName = newDetails.lastName?.trim();
        if (firstName || lastName) finalName = [firstName, lastName].filter(Boolean).join(' ');

        const updated: Guest = {
          ...g,
          documentImage: docImage,
          documentType,
          details: newDetails,
          name: finalName,
        };

        return { ...updated, progress: calculateProgress(updated) };
      });
      if (bid) saveGuestCache(bid, next);
      return next;
    });

    navigateTo(Screen.GuestList);
  };

  // ในส่วนของการส่งข้อมูลไปยัง GuestListScreen
  const handleConfirm = async ({ bookingId, mainGuestName, booking, email }: { bookingId: number; mainGuestName: string; booking: Booking; email: string }) => {
    // อัปเดตข้อมูลการจอง
    setBooking({ ...booking, dbId: bookingId });

    if (!bookingId || isNaN(Number(bookingId))) {
      setError('ไม่พบ bookingId จาก Reservation');
      return;
    }

    // ตั้งค่า guest list ให้สามารถแก้ไขได้
    setIsGuestListReadOnly(false);

    // ส่งข้อมูลไปยัง GuestListScreen โดยไม่แสดงอีเมลใน UI
    setGuests(prev => {
      const main: Guest = {
        id: prev.find(g => g.isMainGuest)?.id ?? `guest_main_${Date.now()}`,  // id สำหรับผู้จองหลัก
        name: mainGuestName?.trim() || prev.find(g => g.isMainGuest)?.name || 'Main Guest',  // ชื่อผู้จองหลัก
        isMainGuest: true,  // กำหนดให้เป็นผู้จองหลัก
        progress: prev.find(g => g.isMainGuest)?.progress ?? 0,  // ความคืบหน้า
        documentType: prev.find(g => g.isMainGuest)?.documentType ?? DocumentType.IDCard,  // ประเภทเอกสาร
        details: prev.find(g => g.isMainGuest)?.details,  // รายละเอียดของผู้จองหลัก
        faceImage: prev.find(g => g.isMainGuest)?.faceImage,  // รูปภาพของผู้จองหลัก
        documentImage: prev.find(g => g.isMainGuest)?.documentImage,  // รูปภาพเอกสาร
        email,  // เพิ่มอีเมล แต่จะไม่แสดงใน UI
      } as Guest;

      // ส่งข้อมูลผู้จองหลักและข้อมูลอื่นๆ ไปยัง GuestListScreen
      return [main, ...prev];
    });

    // เปลี่ยนไปยังหน้า GuestListScreen
    navigateTo(Screen.GuestList);
  };

  // ✅ finalize check-in (กัน email/mainGuest หายหลัง merge)
  const handleCheckinConfirm = (updatedBooking?: Booking) => {
    const bookingId =
      extractBookingId(updatedBooking) ??
      extractBookingId(booking);

    if (!bookingId) {
      console.error('[App] ❌ bookingId missing', updatedBooking, booking);
      setError('ไม่พบ bookingId จากระบบ');
      return;
    }

    if (guests.length > 0) {
      saveGuestCache(bookingId, normalizeGuestsForDisplay(guests));
    }

      if (updatedBooking) {
        setBooking(prev => {
          const prevB = prev ?? ({} as Booking);

          const merged: Booking = {
            ...prevB,
            ...updatedBooking,
            dbId: bookingId,

          // ✅ ถ้า updated ไม่มี email/mainGuest ให้ใช้ของเดิม
          email:
            (updatedBooking as any)?.email ??
            (updatedBooking as any)?.guestEmail ??
            (updatedBooking as any)?.customerEmail ??
            (prevB as any)?.email ??
            (prevB as any)?.guestEmail ??
            (prevB as any)?.customerEmail ??
            '',
          mainGuest:
            (updatedBooking as any)?.mainGuest ??
            (updatedBooking as any)?.guestName ??
            (updatedBooking as any)?.customerName ??
            (prevB as any)?.mainGuest ??
            (prevB as any)?.guestName ??
            (prevB as any)?.customerName ??
            '',
        };

        try {
          localStorage.setItem("checkedin_booking", JSON.stringify(merged));
          if (bookingId) localStorage.setItem(CHECKIN_BOOKING_ID_KEY, String(bookingId));
        } catch { }

        return merged;
      });
    } else {
      setBooking(prev => (prev ? { ...prev, dbId: bookingId } : prev));
      try {
        if (bookingId) localStorage.setItem(CHECKIN_BOOKING_ID_KEY, String(bookingId));
      } catch { }
    }

    navigateTo(Screen.CheckinComplete);
  };

  // review / checkout / extend handlers
  const handleReviewConfirm = () => navigateTo(Screen.GuestList);

  const handleConfirmCheckout = async () => {
    if (!booking?.dbId) {
      setError('ไม่พบ bookingId');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await checkoutBooking(booking.dbId);
      navigateTo(Screen.CheckoutSuccess);
    } catch {
      setError('Checkout ไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishCheckoutProcess = () => {
    setBooking(null);
    setGuests([]);
    navigateTo(Screen.Welcome);
  };

  const handleExtendStay = async (extensionHours: number) => {
    if (!booking || !booking.stay?.hours || !booking.dbId) return;

    const firstRoom = booking.rooms?.[0];
    if (!firstRoom) return;

    const hourlyRate = firstRoom.room?.hourlyRate ?? 0;
    const currentCharges = (firstRoom as any).charges ?? 0;

    setIsLoading(true);
    setError(null);

    try {
      let currentCheckoutDate = new Date();
      try {
        if (booking.stay?.to?.includes(',')) {
          const [datePart, timePart] = booking.stay.to.split(', ');
          const dateParts = datePart.split('-');
          const timeParts = timePart.split(':');
          currentCheckoutDate = new Date(
            parseInt(dateParts[0], 10),
            parseInt(dateParts[1], 10) - 1,
            parseInt(dateParts[2], 10),
            parseInt(timeParts[0], 10),
            parseInt(timeParts[1], 10),
          );
        } else {
          currentCheckoutDate = new Date(booking.stay.to || Date.now());
        }
      } catch {
        currentCheckoutDate = new Date(booking.stay.to || Date.now());
      }

      currentCheckoutDate.setHours(currentCheckoutDate.getHours() + extensionHours);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const newCheckoutString = `${currentCheckoutDate.getFullYear()}-${pad(currentCheckoutDate.getMonth() + 1)}-${pad(currentCheckoutDate.getDate())}, ${pad(currentCheckoutDate.getHours())}:${pad(currentCheckoutDate.getMinutes())}`;

      const additionalCharges = extensionHours * hourlyRate;
      const newTotalCharges = currentCharges + additionalCharges;

      const newBooking: Booking = {
        ...booking,
        stay: {
          ...booking.stay,
          to: newCheckoutString,
          hours: (booking.stay?.hours || 0) + extensionHours,
        },
        rooms: booking.rooms?.map((r, idx) =>
          idx === 0
            ? {
              ...(r as any),
              room: {
                ...(r as any).room,
                charges: newTotalCharges,
              },
            }
            : r
        ) as any,
      };

      setBooking(newBooking);
      navigateTo(Screen.PostCheckinDetails);
    } catch (err) {
      console.error('Extend Stay save failed:', err);
      const msg = err instanceof Error ? err.message : (t('error.extendSaveFailed') ?? 'Extend save failed');
      setError((t('error.extendSaveFailed') ?? 'Extend save failed') + ': ' + msg);
    } finally {
      setIsLoading(false);
    }
  };

  // render logic
  const renderScreen = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-semibold text-gray-700">{t('common.loading') ?? 'Loading...'}</p>
          </div>
        </div>
      );
    }

    switch (screen) {
      case Screen.Welcome:
        return <WelcomeScreen onStart={() => navigateTo(Screen.EnterCode)} />;

      case Screen.EnterCode:
        return <EnterCodeScreen onSubmit={handleCodeSubmit} error={error} onBack={() => navigateTo(Screen.Welcome)} />;

      case Screen.ReservationDetails:
        if (HIDE_RESERVATION_PAGE) {
          return <EnterCodeScreen onSubmit={handleCodeSubmit} error={error} onBack={() => navigateTo(Screen.Welcome)} />;
        }
        return (
          <ReservationDetailsScreen
            booking={booking}
            token={checkinToken}
            onConfirm={({ bookingId, mainGuestName, booking }) => {
              setBooking({
                ...(booking as any),
                dbId: bookingId,
              });
              setGuestListBookingId(bookingId);

              if (!bookingId || isNaN(Number(bookingId))) {
                setError('ไม่พบ bookingId จาก Reservation');
                return;
              }

              setIsGuestListReadOnly(false);

              // ใน `handleConfirm` ส่งข้อมูล guest ที่อัปเดตไปยัง GuestListScreen
              setGuests(prev => {
                const main: Guest = {
                  id: prev.find(g => g.isMainGuest)?.id ?? `guest_main_${Date.now()}`,  // id สำหรับผู้จองหลัก
                  name: mainGuestName?.trim() || prev.find(g => g.isMainGuest)?.name || 'Main Guest',  // ชื่อผู้จองหลัก
                  isMainGuest: true,  // กำหนดให้เป็นผู้จองหลัก
                  progress: prev.find(g => g.isMainGuest)?.progress ?? 0,  // ความคืบหน้า
                  documentType: prev.find(g => g.isMainGuest)?.documentType ?? DocumentType.IDCard,  // ประเภทเอกสาร
                  details: prev.find(g => g.isMainGuest)?.details,  // รายละเอียดของผู้จองหลัก
                  faceImage: prev.find(g => g.isMainGuest)?.faceImage,  // รูปภาพของผู้จองหลัก
                  documentImage: prev.find(g => g.isMainGuest)?.documentImage,  // รูปภาพเอกสาร
               
                } as Guest;

                const accRaw = (booking as any)?.accompanyingGuests ?? [];
                const accGuests: Guest[] = Array.isArray(accRaw)
                  ? accRaw.map((g: any, idx: number) => {
                    const name = (g?.name ?? g?.fullName ?? g?.guestName ?? '').toString().trim();
                    const type = (g?.type ?? g?.guestType ?? '').toString().trim();
                    const displayName = `${name || `Guest ${idx + 2}`}${type ? ` (${type})` : ''}`;

                    return {
                      id: `guest_acc_${g?.id ?? idx}_${Date.now()}`,
                      name: displayName,
                      isMainGuest: false,
                      progress: 0,
                      documentType: DocumentType.IDCard,
                      details: {} as any,
                    } as Guest;
                  })
                  : [];

                const merged = [main, ...accGuests];
                const dedup = new Map<string, Guest>();
                for (const g of merged) {
                  const key = `${g.isMainGuest ? 'MAIN' : 'ACC'}:${g.name}`;
                  if (!dedup.has(key)) dedup.set(key, g);
                }
                return Array.from(dedup.values());
              });

              // หลังจากอัปเดตข้อมูลผู้เข้าพักแล้ว ก็เปลี่ยนไปยังหน้า GuestListScreen
              navigateTo(Screen.GuestList);

            }}
            onBack={() => navigateTo(Screen.EnterCode)}
            onShowPrivacyPolicy={() => navigateTo(Screen.PrivacyPolicy)}
          />
        );

      case Screen.GuestList:
        return (
          <GuestListScreen
            guests={guests}
            token={checkinToken}
            bookingId={guestListBookingId ?? booking?.dbId ?? booking?.id ?? (booking as any)?.bookingId}
            onConfirm={handleCheckinConfirm}
            onBack={() =>
              navigateTo(isGuestListReadOnly ? Screen.PostCheckinDetails : Screen.ReservationDetails)
            }
            onTakePhoto={(id) => { setActiveGuestId(id); navigateTo(Screen.FaceCapture); }}
            onCaptureDocument={(id) => { setActiveGuestId(id); navigateTo(Screen.DocumentType); }}
            onAddGuest={handleAddGuest}
            onDeleteGuest={handleDeleteGuest}
            onUpdateGuestDetails={handleUpdateGuestDetails}
            isReadOnly={isGuestListReadOnly}
          />
        );

      case Screen.FaceCapture:
        return <FaceCaptureScreen guest={activeGuest!} onCapture={handleFaceCapture} onBack={() => navigateTo(Screen.GuestList)} />;

      case Screen.DocumentType:
        return <DocumentTypeScreen onSelect={(type) => { setDocumentType(type); navigateTo(Screen.DocumentCapture); }} onBack={() => navigateTo(Screen.GuestList)} />;

      case Screen.DocumentCapture:
        return <DocumentCaptureScreen documentType={documentType!} onCapture={handleDocumentCapture} onBack={() => navigateTo(Screen.DocumentType)} />;

      case Screen.CheckinComplete:
        return (
          <CheckinCompleteScreen
            booking={booking}
            token={checkinToken}
            onFinish={() => navigateTo(Screen.PostCheckinDetails)}
          />
        );

      case Screen.PostCheckinDetails:
        return (
          <PostCheckinDetailsScreen
            booking={booking}
            bookingId={
              booking?.dbId ??
              (booking as any)?.id ??
              (booking as any)?.bookingId ??
              (booking as any)?.booking_id
            }
            token={checkinToken}
            onBack={() => navigateTo(Screen.Welcome)}
            onCheckout={() => navigateTo(Screen.Checkout)}
            onViewGuests={(bookingIdArg) => {
              setIsGuestListReadOnly(true);
              if (bookingIdArg) setGuestListBookingId(Number(bookingIdArg));

              try {
                const q = new URLSearchParams(window.location.search);
                if (bookingIdArg) q.set("bookingId", String(bookingIdArg));
                const newSearch = q.toString();
                const newUrl =
                  window.location.pathname +
                  (newSearch ? `?${newSearch}` : "") +
                  window.location.hash;
                window.history.replaceState({}, document.title, newUrl);
              } catch {
                // ignore
              }

              (async () => {
                const rv =
                  extractBookingId({ dbId: bookingIdArg }) ??
                  extractBookingId(booking);
                if (!rv) {
                  setGuests([]);
                  setError('ไม่พบ bookingId');
                  navigateTo(Screen.GuestList);
                  return;
                }

                try {
                  const resp: any = await apiService.fetchGuests(rv);
                  const rawGuests = Array.isArray(resp) ? resp : (resp?.data ?? []);
                  const uiGuests = rawGuests.map((g: any, idx: number) =>
                    mapBackendGuestToUi(g, idx)
                  );
                  const cached = loadGuestCache(rv);
                  const merged = mergeGuestsPreferCache(uiGuests, cached);
                  setGuests(normalizeGuestsForDisplay(merged));
                } catch {
                  const cached = loadGuestCache(rv);
                  setGuests(normalizeGuestsForDisplay(cached));
                }
                setGuestListBookingId(rv);
                navigateTo(Screen.GuestList);
              })();
            }}
            onViewRoomAccess={() => navigateTo(Screen.RoomAccessInformation)}
            onExtendStay={() => navigateTo(Screen.ExtendStay)}
          />
        );

      case Screen.RoomAccessInformation:
        return (
          <RoomAccessInformationScreen
            booking={booking!}
            token={checkinToken}
            onBack={() => navigateTo(Screen.PostCheckinDetails)}
          />
        );

      case Screen.Checkout:
        return <CheckoutScreen onConfirm={handleConfirmCheckout} onCancel={() => navigateTo(Screen.PostCheckinDetails)} />;

      case Screen.CheckoutSuccess:
        return <CheckoutSuccessScreen onFinish={handleFinishCheckoutProcess} />;

      case Screen.ExtendStay:
        return <ExtendStayScreen booking={booking!} onConfirm={handleExtendStay} onBack={() => navigateTo(Screen.PostCheckinDetails)} />;

      case Screen.PrivacyPolicy:
        return <PrivacyPolicyScreen onBack={() => navigateTo(HIDE_RESERVATION_PAGE ? Screen.EnterCode : Screen.ReservationDetails)} />;

      default:
        return <WelcomeScreen onStart={() => navigateTo(Screen.EnterCode)} />;
    }
  };

  return (
    <div className="bg-white min-h-screen font-sans text-gray-900">
      {error && (
        <div className="fixed top-0 left-0 right-0 p-4 bg-red-500 text-white text-center font-semibold z-50 shadow-lg">
          {t('common.error') ?? 'Error'}: {error}
          <button onClick={() => setError(null)} className="ml-4 font-bold">X</button>
        </div>
      )}
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto bg-white min-h-screen">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;
