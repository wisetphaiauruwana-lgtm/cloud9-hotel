// src/services/api.helpers.ts

export interface ApiResponse {
  ID?: number;
  id?: number;
  checkIn?: string;
  checkOut?: string;
  Room?: {
    type?: string;
    roomNumber?: string;
  };
  Customer?: {
    fullName?: string;
    email?: string;
  };
  status?: string;
  message?: string;
  data?: any;
  details?: string;
  error?: {
    code?: string;
    message?: string;
    details?: string;
  };
}

// parse JSON safely (returns parsed JSON or raw text)
export const parseJsonSafe = async (res: Response) => {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return txt; }
};

// normalize API error into user-friendly message (Thai-friendly rules included)
export const normalizeApiError = (raw: any, fallback: string): string => {
  if (!raw) return fallback;

  let source: any = raw;
  if (typeof source === 'object' && source?.error) {
    const err = source.error;
    source = [err.code, err.message].filter(Boolean).join(': ') || err;
  }

  let msg: string | undefined;
  if (typeof source === 'string') msg = source;
  else if (typeof source === 'object') {
    msg = source.message || source.details || source.error;
  }

  if (!msg) msg = fallback;

  // ✅ เพิ่มแค่นี้พอ — ไม่ต้องลบโค้ดอื่น
  if (msg.includes('error.missingBookingIdX')) {
    return ''; // 👈 ไม่แสดงอะไร
  }

  return msg;
};

// Convert base64 string to Blob
export const base64ToBlob = (base64: string, type = 'image/jpeg') => {
  const parts = base64.split(';base64,');
  const rawBase64 = parts.length > 1 ? parts[1] : base64;
  const binStr = atob(rawBase64);
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = binStr.charCodeAt(i);
  return new Blob([arr], { type });
};

// slugify helper
export const slugify = (s?: string) => {
  if (!s) return '';
  return s
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// try parse number or return string
export const tryParseNumberOrString = (v?: number | string) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'number') return v;

  const s = String(v).trim();
  if (s === '') return undefined;

  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    return Number.isNaN(n) ? s : n;
  }

  return s;
};


// normalize/standardize incoming date strings (tries to convert many formats to RFC with Bangkok TZ)
export const normalizeDateString = (s?: string) => {
  if (!s) return undefined;
  let str = String(s).trim();
  if (str === '') return undefined;

  const toRfcWithBangkok = (yyyy: number, mm: number, dd: number) => {
    const Y = String(yyyy).padStart(4, '0');
    const M = String(mm).padStart(2, '0');
    const D = String(dd).padStart(2, '0');
    return `${Y}-${M}-${D}T00:00:00+07:00`;
  };

  const isoFull = str.match(/^\d{4}-\d{2}-\d{2}T/);
  if (isoFull) return str;

  const isoDate = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    return toRfcWithBangkok(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
  }

  const dm = str.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4}|\d{2})$/);
  if (dm) {
    let dd = Number(dm[1]);
    let mm = Number(dm[2]);
    let yyyy = Number(dm[3]);
    if (String(dm[3]).length === 2) {
      yyyy = yyyy <= 69 ? 2000 + yyyy : 1900 + yyyy;
    }
    return toRfcWithBangkok(yyyy, mm, dd);
  }

  const thaiMonths: Record<string, number> = {
    'ม.ค.': 1, 'ม.ค': 1, 'มกราคม': 1, 'มค': 1,
    'ก.พ.': 2, 'ก.พ': 2, 'กุมภาพันธ์': 2, 'กพ': 2,
    'มี.ค.': 3, 'มี.ค': 3, 'มีนาคม': 3, 'มีค': 3,
    'เม.ย.': 4, 'เม.ย': 4, 'เมษายน': 4, 'เมย': 4,
    'พ.ค.': 5, 'พ.ค': 5, 'พฤษภาคม': 5, 'พค': 5,
    'มิ.ย.': 6, 'มิ.ย': 6, 'มิถุนายน': 6, 'มิย': 6,
    'ก.ค.': 7, 'ก.ค': 7, 'กรกฎาคม': 7, 'กค': 7,
    'ส.ค.': 8, 'ส.ค': 8, 'สิงหาคม': 8, 'สค': 8,
    'ก.ย.': 9, 'ก.ย': 9, 'กันยายน': 9, 'กย': 9,
    'ต.ค.': 10, 'ต.ค': 10, 'ตุลาคม': 10, 'ตค': 10,
    'พ.ย.': 11, 'พ.ย': 11, 'พฤศจิกายน': 11, 'พย': 11,
    'ธ.ค.': 12, 'ธ.ค': 12, 'ธันวาคม': 12, 'ธค': 12
  };

  const thaiPattern = str.match(/^(\d{1,2})\s+([^\d\s]+(?:\.\s?|\.?))\s+(\d{2,4})$/u);
  if (thaiPattern) {
    const day = Number(thaiPattern[1]);
    let monthToken = thaiPattern[2].trim().replace(/\.$/, '');
    const yearToken = Number(thaiPattern[3]);
    let monthNum = thaiMonths[monthToken] ?? thaiMonths[monthToken.replace(/\s/g, '')];

    if (monthNum) {
      let year = yearToken;
      if (year >= 2400) year = year - 543;
      if (year < 100) year = year <= 69 ? 2000 + year : 1900 + year;
      return toRfcWithBangkok(year, monthNum, day);
    }
  }

  const enMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
  if (enMatch) {
    const day = Number(enMatch[1]);
    const monthName = enMatch[2];
    const year = Number(enMatch[3]);
    const d = new Date(`${monthName} ${day}, ${year}`);
    if (!isNaN(d.getTime())) {
      return toRfcWithBangkok(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return toRfcWithBangkok(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  return str;
};
