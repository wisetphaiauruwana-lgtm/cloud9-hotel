// src/components/screens/EnterCodeScreen.tsx
import React, { useState } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Button from '../ui/Button';
import { AlertCircleIcon, CheckCircleIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';
import { apiService } from '../../services/apiService'; // <-- ใช้ apiService
import { useNavigate } from 'react-router-dom';

interface EnterCodeScreenProps {
  onSubmit: (token: string) => void;
  onBack: () => void;
  error?: string | null;
}

const styles = {
  container: "flex flex-col min-h-screen bg-white",
  main: "flex-grow flex flex-col items-center justify-center px-6 py-10 text-center",
  form: "w-full max-w-[360px] space-y-6",
  inputContainer: "space-y-2 text-left",
  title: "text-sm font-bold tracking-[0.2em] text-gray-900 text-center",
  input: "w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-left text-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-400 shadow-sm",
  messageBase: "flex items-center gap-2 text-xs",
  errorMessage: "text-red-600",
  successMessage: "text-emerald-600",
  icon: "w-4 h-4",
  labelText: "block text-xs text-gray-600 mb-1",
  buttonWrap: "w-full max-w-[260px] mx-auto"
};

const normalizeCode = (s: string) => {
  if (!s) return "";
  return s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
};

const formatDisplayCode = (raw: string) => {
  const n = normalizeCode(raw);
  if (n.length === 8) return `${n.slice(0, 4)}-${n.slice(4)}`;
  return raw;
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
    if (rawNorm.length !== 8) {
      setIsValid(false);
      setMessage(t('enterCode.invalidFormat') || "กรุณากรอกรหัสให้ถูกต้อง (8 ตัวอักษร A-Z0-9)");
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

      if (booking && (booking.checkedInAt || booking.status === "Checked-In")) {
        localStorage.setItem("checkedin_booking", JSON.stringify(booking));
        onSubmit("ALREADY_CHECKEDIN");
        return;
      }


      const token =
        resp?.token ||
        resp?.data?.token ||
        (typeof resp === 'string' ? resp : null);

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
      <Header onBack={onBack} />
      <main className={styles.main}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputContainer}>
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
                placeholder={t('enterCode.placeholder') || "ABCD-EFGH"}
                className={styles.input}
                maxLength={12}
                aria-label="confirmation-code"
              />
            </div>
          </div>

          {(externalError && isValid === false) && (
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
