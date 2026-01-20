// src/components/screens/EnterCodeScreen.tsx
import React, { useState } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Button from '../ui/Button';
import { AlertCircleIcon, CheckCircleIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';
import { apiService } from '../../services/apiService'; // <-- ใช้ apiService
import { useNavigate } from 'react-router-dom';
import { CloudIcon } from '../icons/Icons';

const CHECKIN_BOOKING_ID_KEY = "checkin_booking_id";

interface EnterCodeScreenProps {
  onSubmit: (token: string) => void;
  onBack: () => void;
  error?: string | null;
}

const styles = {
  container: "flex flex-col min-h-screen bg-white",
  main: "flex-grow flex flex-col items-center justify-center px-6 py-8 text-center",
  form: "w-full max-w-[360px] md:max-w-[600px] lg:max-w-[720px] space-y-6",
  inputContainer: "space-y-2 text-left",
  brand: "flex flex-col items-center gap-2",
  brandText: "text-3xl md:text-4xl font-bold tracking-widest text-gray-900",
  title: "text-xs font-bold tracking-[0.22em] text-gray-900 text-center",
  input: "w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-left text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-400 shadow-sm",
  messageBase: "flex items-center gap-2 text-xs",
  errorMessage: "text-red-600",
  successMessage: "text-emerald-600",
  icon: "w-4 h-4",
  labelText: "block text-xs text-gray-600 mb-1",
  buttonWrap: "w-full max-w-[360px] md:max-w-[600px] lg:max-w-[720px] mx-auto"
};

const normalizeCode = (s: string) => {
  if (!s) return "";
  return s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
};

const formatDisplayCode = (raw: string) => {
  const n = normalizeCode(raw);
  if (n.length === 12) return `${n.slice(0, 4)}-${n.slice(4, 8)}-${n.slice(8)}`;
  return raw;
};

const extractBookingIdFromVerify = (resp: any): number | undefined => {
  const v =
    resp?.bookingId ??
    resp?.booking_id ??
    resp?.booking?.id ??
    resp?.booking?.bookingId ??
    resp?.booking?.booking_id ??
    resp?.data?.bookingId ??
    resp?.data?.booking_id ??
    resp?.data?.booking?.id ??
    resp?.data?.booking?.bookingId ??
    resp?.data?.booking?.booking_id;
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const extractBookingRoomIdFromVerify = (resp: any): number | undefined => {
  const v =
    resp?.bookingRoomId ??
    resp?.booking_room_id ??
    resp?.data?.bookingRoomId ??
    resp?.data?.booking_room_id ??
    resp?.booking?.bookingRoomId ??
    resp?.booking?.booking_room_id;
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const EnterCodeScreen: React.FC<EnterCodeScreenProps> = ({ onSubmit, onBack, error: externalError = null }) => {
  const [code, setCode] = useState("");
  // no queryText input — we only use the code; apiService will default query to code if needed
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [debugDetails, setDebugDetails] = useState<string | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // single input (CONFIRMATION CODE) — no query field shown
  const isButtonDisabled = loading || code.trim().length === 0;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage(null);
    setIsValid(null);

    const rawNorm = normalizeCode(code);
    if (rawNorm.length !== 12) {
      setIsValid(false);
      setMessage(t('enterCode.invalidFormat') || "กรุณากรอกรหัสให้ถูกต้อง (1 ตัวอักษร + 11 ตัวเลข)");
      return;
    }

    setLoading(true);

    try {
      // call apiService.verifyCheckinCode which uses API_BASE_URL (http://localhost:8080)
      const resp = await apiService.verifyCheckinCode({ code: formatDisplayCode(code) });

      console.log('[EnterCode] verify response =', resp);
      // assume resp contains token or booking info
      // common pattern: backend returns { token: '...' }
      // 🟢 ตรวจสอบว่า Booking เช็กอินแล้วหรือยัง
      const booking =
        resp?.booking ||
        resp?.data?.booking ||
        resp?.data ||
        null;

      const token =
        resp?.token ||
        resp?.data?.token ||
        (typeof resp === 'string' ? resp : null);

      const bookingId = extractBookingIdFromVerify(resp);
      if (bookingId) {
        try { localStorage.setItem(CHECKIN_BOOKING_ID_KEY, String(bookingId)); } catch { }
      }
      const bookingRoomId = extractBookingRoomIdFromVerify(resp);
      if (bookingRoomId) {
        try { localStorage.setItem("checkin_booking_room_id", String(bookingRoomId)); } catch { }
      }

      if (booking && (booking.checkedOutAt || booking.status === "Checked-Out")) {
        setIsValid(false);
        setMessage(t('enterCode.checkedOut') || "การเช็กเอ้าเสร็จสิ้นแล้ว ไม่สามารถเข้าระบบได้");
        return;
      }

      if (booking && (booking.checkedInAt || booking.status === "Checked-In")) {
        localStorage.setItem("checkedin_booking", JSON.stringify(booking));
        if (token) {
          localStorage.setItem('checkin_token', String(token));
        }
        onSubmit("ALREADY_CHECKEDIN");
        return;
      }

      console.log('[EnterCode] extracted token =', token);

      if (token) {
        setIsValid(true);
        setMessage("Booking code is correct!");

        // ⭐ เก็บ token
        localStorage.setItem('checkin_token', String(token));

        setTimeout(() => {
          onSubmit(String(token)); // ⭐ กลับไปให้ App จัดการ
        }, 300);

        return;
      }



      // if no token, but successful response with booking data, you may extract token differently
      setIsValid(false);
      setMessage(t('enterCode.serverError') || "ไม่สามารถยืนยันรหัสได้ ลองอีกครั้ง");
    } catch (err: any) {
  console.error('[ui] verifyCheckinCode error', err);

  const errMsg =
    err?.message ||
    (t('enterCode.networkError') || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ โปรดลองอีกครั้ง");

  setIsValid(false);
  setMessage(errMsg);

  if (import.meta.env.DEV) {
    try { setDebugDetails(JSON.stringify(err, Object.getOwnPropertyNames(err))); }
    catch { setDebugDetails(String(err)); }
  }
}
 finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Header onBack={onBack} compact showLogo={false} showBorder={false} />
      <main className={styles.main}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputContainer}>
            <div className={styles.brand}>
              <CloudIcon className="w-32 h-32 md:w-36 md:h-36" />
            </div>
            <h1 className={styles.title}>{t('enterCode.title') || "ENTER YOUR CONFIRMATION CODE"}</h1>

            <div>
              <label className={styles.labelText}>{t('enterCode.codeLabel') || "Confirmation Code"}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setIsValid(null);
                  setMessage(null);
                }}
                placeholder={t('enterCode.placeholder') || "A123-4567-8901"}
                className={styles.input}
                maxLength={14}
                aria-label="confirmation-code"
              />
            </div>
          </div>

          {externalError && isValid !== true && (
            <div className={`${styles.messageBase} ${styles.errorMessage}`}>
              <AlertCircleIcon className={styles.icon} />
              <span>{externalError}</span>
            </div>
          )}

          {message && isValid === false && (
            <div className={`${styles.messageBase} ${styles.errorMessage}`}>
              <AlertCircleIcon className={styles.icon} />
              <span>{message}</span>
            </div>
          )}

          {isValid === true && message && (
            <div className={`${styles.messageBase} ${styles.successMessage}`}>
              <CheckCircleIcon className={styles.icon} />
              <span>{message}</span>
            </div>
          )}
          {debugDetails && (
            <pre className="text-xs text-gray-500 mt-2">{debugDetails}</pre>
          )}

          <div className={styles.buttonWrap}>
            <Button type="submit" disabled={isButtonDisabled}>
              {loading ? (t('buttons.loading') || "Checking...") : (t('buttons.submit') || "SUBMIT")}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default EnterCodeScreen;
