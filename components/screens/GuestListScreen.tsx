// src/components/screens/GuestListScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DocumentType, type Guest, type Booking } from '../../types';

import Header from '../layout/Header';
import Button from '../ui/Button';
import { ChevronDownIcon, ChevronUpIcon, CloudIcon, EditIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useLocation } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import {
  loadGuestCache,
  saveGuestCache,
  mergeGuestsPreferCache,
  normalizeGuestsForDisplay,
} from "../../utils/guestCache";

const CONSENT_ID = 1;
const CHECKIN_BOOKING_ID_KEY = "checkin_booking_id";
const CHECKIN_BOOKING_ROOM_ID_KEY = "checkin_booking_room_id";

/* ---------------- UI components (same style) ---------------- */
const editableFieldStyles = {
  container: "flex items-center border-b border-gray-200 py-2",
  label: "block text-xs md:text-sm lg:text-base font-medium text-gray-500 mb-1",
  input: "w-full bg-transparent focus:outline-none text-sm md:text-base lg:text-lg placeholder:text-gray-400 text-gray-900",
  icon: "w-5 h-5 lg:w-6 lg:h-6 text-gray-400 ml-2 flex-shrink-0",
};

const EditableField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder: string;
}> = ({ label, value, onChange, readOnly = false, placeholder }) => {
  return (
    <div>
      <label className={editableFieldStyles.label}>{label}</label>
      <div className={editableFieldStyles.container}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={editableFieldStyles.input}
          placeholder={placeholder}
          readOnly={readOnly}
        />
        {!readOnly && <EditIcon className={editableFieldStyles.icon} />}
      </div>
    </div>
  );
};

const guestListItemStyles = {
  container: "bg-slate-100 rounded-2xl border border-gray-200 shadow-sm",
  header: "w-full flex justify-between items-center p-4 md:p-5 lg:p-6 text-left border-b border-gray-300",
  guestInfoContainer: "flex items-center flex-1",
  guestName: "text-xl md:text-2xl font-extrabold text-gray-900",
  guestRole: "text-base md:text-lg text-gray-700",
  guestNameContainer: "cursor-pointer",
  guestNameContainerDisabled: "",
  progressContainer: "flex items-center gap-3",
  progressText: "text-lg md:text-xl font-bold",
  progressComplete: "text-green-500",
  progressIncomplete: "text-red-500",
  content: "px-4 md:px-5 lg:px-6 pt-5 pb-6",
  verifiedContainer: "pt-4 space-y-5",
  imageGrid: "grid grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-start",
  imageLabel: "text-sm md:text-base font-semibold text-gray-700 mb-1",
  verifiedImage: "rounded-lg w-full object-cover shadow-sm border border-gray-200",
  verifiedDocument: "rounded-lg w-full object-contain shadow-sm border border-gray-200",
  detailsContainer: "space-y-3 pt-2",
  actionsContainer: "space-y-6 pt-2",
  actionRow: "flex flex-col items-start gap-3",
  actionLabel: "text-base md:text-lg font-semibold text-gray-900",
  actionLabelDisabled: "text-gray-400",
  proceedButton: "bg-black text-white hover:bg-gray-800 px-5 py-2 rounded-md text-xs font-bold tracking-widest",
  divider: "border-gray-300",
  imageWrapper: "relative",
  retakeButton: "absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold py-1 px-2 rounded hover:bg-black backdrop-blur-sm transition-colors",
};

interface GuestListItemProps {
  guest: Guest;
  onTakePhoto: () => void;
  onCaptureDocument: () => void;
  isEditing: boolean;
  isReadOnly: boolean;
  isSelected: boolean;
  onSelectToggle: () => void;
  onUpdateDetails: (details: Guest['details']) => void;
}

const GuestListItem: React.FC<GuestListItemProps> = ({
  guest,
  onTakePhoto,
  onCaptureDocument,
  isEditing,
  isReadOnly,
  isSelected,
  onSelectToggle,
  onUpdateDetails,
}) => {
  const [isOpen, setIsOpen] = useState(!!guest.isMainGuest);
  const [details, setDetails] = useState(guest.details);
  const { t } = useTranslation();

  const displayDOB = details?.dateOfBirth ? String(details.dateOfBirth).split('T')[0] : '';
  const isFilled = (v: any) => String(v ?? '').trim() !== '';

  const toImageSrc = (value?: string) => {
    const v = String(value ?? '').trim();
    if (!v) return undefined;
    if (v.startsWith('data:') || v.startsWith('http://') || v.startsWith('https://')) return v;
    return `data:image/jpeg;base64,${v}`;
  };

  const faceSrc = toImageSrc(guest.faceImage);
  const documentSrc = toImageSrc(guest.documentImage);

  useEffect(() => { setDetails(guest.details); }, [guest.details]);

  const renderDetailsFields = () => (
    <>
      {(!isReadOnly || isFilled(details?.firstName)) && (
        <EditableField
          label={t('guestList.firstName')}
          placeholder={t('guestList.firstName')}
          value={details?.firstName ?? ''}
          onChange={(v) => handleDetailChange('firstName', v)}
          readOnly={isReadOnly}
        />
      )}

      {(!isReadOnly || isFilled(details?.lastName)) && (
        <EditableField
          label={t('guestList.lastName')}
          placeholder={t('guestList.lastName')}
          value={details?.lastName ?? ''}
          onChange={(v) => handleDetailChange('lastName', v)}
          readOnly={isReadOnly}
        />
      )}

      {(!isReadOnly || !!guest.documentType) && (
        <EditableField
          label="Document Type"
          placeholder="Document Type"
          value={
            guest.documentType === DocumentType.Passport
              ? 'Passport'
              : guest.documentType === DocumentType.IDCard
                ? 'Thai ID Card'
                : ''
          }
          onChange={() => { }}
          readOnly={true}
        />
      )}

      {(!isReadOnly || isFilled(details?.documentNumber)) && (
        <EditableField
          label={guest.documentType === DocumentType.Passport ? t('guestList.passportNumber') : t('guestList.idNumber')}
          placeholder={guest.documentType === DocumentType.Passport ? t('guestList.passportNumber') : t('guestList.idNumber')}
          value={details?.documentNumber ?? ''}
          onChange={(v) => handleDetailChange('documentNumber', v)}
          readOnly={isReadOnly}
        />
      )}

      {(!isReadOnly || isFilled(details?.nationality)) && (
        <EditableField
          label={t('guestList.nationality')}
          placeholder={t('guestList.nationality')}
          value={details?.nationality ?? ''}
          onChange={(v) => handleDetailChange('nationality', v)}
          readOnly={isReadOnly}
        />
      )}

      {(!isReadOnly || isFilled(details?.gender)) && (
        <EditableField
          label={t('guestList.gender')}
          placeholder={t('guestList.gender')}
          value={details?.gender ?? ''}
          onChange={(v) => handleDetailChange('gender', v)}
          readOnly={isReadOnly}
        />
      )}

      {(!isReadOnly || isFilled(displayDOB)) && (
        <EditableField
          label={t('guestList.dateOfBirth')}
          placeholder={t('guestList.dateOfBirth')}
          value={displayDOB}
          onChange={(v) => handleDetailChange('dateOfBirth', v)}
          readOnly={isReadOnly}
        />
      )}

      {guest.documentType === DocumentType.IDCard && (!isReadOnly || isFilled(details?.currentAddress)) && (
        <EditableField
          label={t('guestList.currentAddress')}
          placeholder={t('guestList.currentAddress')}
          value={details?.currentAddress ?? ''}
          onChange={(v) => handleDetailChange('currentAddress', v)}
          readOnly={isReadOnly}
        />
      )}
    </>
  );

  const handleDetailChange = (field: keyof NonNullable<Guest['details']>, value: string) => {
    if (isReadOnly) return; // ถ้าฟอร์มเป็นแบบ Read-Only ไม่สามารถแก้ไขได้
    const newDetails = {
      ...(details || {}),
      [field]: value, // อัพเดตฟิลด์ที่กรอก
    } as NonNullable<Guest['details']>;

    setDetails(newDetails); // อัพเดต state
    onUpdateDetails(newDetails); // ส่งข้อมูลใหม่กลับไปที่ parent component
  };


  const handleToggle = () => { if (!isEditing) setIsOpen(!isOpen); };

  useEffect(() => {
    if (isEditing) setIsOpen(false);
    else if (guest.isMainGuest) setIsOpen(true);
  }, [isEditing, guest.isMainGuest]);

  return (
    <div className={guestListItemStyles.container}>
      <div className={guestListItemStyles.header}>
        <div className={guestListItemStyles.guestInfoContainer}>
          {isEditing && !guest.isMainGuest && (
            <button onClick={onSelectToggle} className="mr-3" aria-label="select-guest">
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-black' : 'border-gray-400'}`}>
                {isSelected && <span className="w-2 h-2 bg-black rounded-full" />}
              </span>
            </button>
          )}

          <div
            onClick={handleToggle}
            className={!isEditing ? guestListItemStyles.guestNameContainer : guestListItemStyles.guestNameContainerDisabled}
          >
            <p className={guestListItemStyles.guestName}>{guest.name}</p>
            {guest.isMainGuest && <p className={guestListItemStyles.guestRole}>{t('guestList.mainGuest')}</p>}
          </div>
        </div>

        <button onClick={handleToggle} className={guestListItemStyles.progressContainer} disabled={isEditing} aria-disabled={isEditing}>
          <span className={`${guestListItemStyles.progressText} ${guest.progress === 100 ? guestListItemStyles.progressComplete : guestListItemStyles.progressIncomplete}`}>
            {t('guestList.progress', { progress: guest.progress })}
          </span>
          {isOpen && !isEditing ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
      </div>

      {isOpen && !isEditing && (
        <div className={guestListItemStyles.content}>
          {isReadOnly ? (
            <div className={guestListItemStyles.verifiedContainer}>
              {(faceSrc || documentSrc) && (
                <div className={guestListItemStyles.imageGrid}>
                  {faceSrc && (
                    <div>
                      <p className={guestListItemStyles.imageLabel}>{t('guestList.verifiedImage')}</p>
                      <img src={faceSrc} alt="Verified face" className={guestListItemStyles.verifiedImage} />
                    </div>
                  )}
                  {documentSrc && (
                    <div>
                      <p className={guestListItemStyles.imageLabel}>{t('guestList.verifiedDocument')}</p>
                      <img src={documentSrc} alt="Verified document" className={guestListItemStyles.verifiedDocument} />
                    </div>
                  )}
                </div>
              )}
              <div className={guestListItemStyles.detailsContainer}>
                {renderDetailsFields()}
              </div>
            </div>
          ) : !guest.faceImage ? (
            <div className={guestListItemStyles.actionsContainer}>
              <div className={guestListItemStyles.actionRow}>
                <span className={guestListItemStyles.actionLabel}>{t('guestList.takePhoto')}</span>
                <button onClick={onTakePhoto} className={guestListItemStyles.proceedButton}>
                  {t('buttons.proceed')}
                </button>
              </div>
              <hr className={guestListItemStyles.divider} />
              <div className={guestListItemStyles.actionRow}>
                <span className={`${guestListItemStyles.actionLabel} ${guestListItemStyles.actionLabelDisabled}`}>
                  {t('guestList.captureDocument')}
                </span>
                <button className={guestListItemStyles.proceedButton} disabled={true}>
                  {t('buttons.proceed')}
                </button>
              </div>
            </div>
          ) : !guest.documentImage ? (
            <div className={guestListItemStyles.actionsContainer}>
              <div>
                <p className={`${guestListItemStyles.imageLabel} mb-2`}>{t('guestList.verifiedImage')}</p>
                <div className={guestListItemStyles.imageWrapper}>
                  {faceSrc && (
                    <img
                      src={faceSrc}
                      alt="Verified face"
                      className="rounded-lg w-32 md:w-40 lg:w-48 object-cover shadow-sm"
                    />
                  )}
                  {!isReadOnly && (
                    <button onClick={onTakePhoto} className={guestListItemStyles.retakeButton}>
                      {t('buttons.retake')}
                    </button>
                  )}
                </div>
              </div>
              <hr className={guestListItemStyles.divider} />
              <div className={guestListItemStyles.actionRow}>
                <span className={guestListItemStyles.actionLabel}>{t('guestList.captureDocument')}</span>
                <button onClick={onCaptureDocument} className={guestListItemStyles.proceedButton}>
                  {t('buttons.proceed')}
                </button>
              </div>
            </div>
          ) : (
            <div className={guestListItemStyles.verifiedContainer}>
              <div className={guestListItemStyles.imageGrid}>
                <div>
                  <p className={guestListItemStyles.imageLabel}>{t('guestList.verifiedImage')}</p>
                  <div className={guestListItemStyles.imageWrapper}>
                    {faceSrc && <img src={faceSrc} alt="Verified face" className={guestListItemStyles.verifiedImage} />}
                    {!isReadOnly && (
                      <button onClick={onTakePhoto} className={guestListItemStyles.retakeButton}>
                        {t('buttons.retake')}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <p className={guestListItemStyles.imageLabel}>{t('guestList.verifiedDocument')}</p>
                  <div className={guestListItemStyles.imageWrapper}>
                    {documentSrc && (
                      <img src={documentSrc} alt="Verified document" className={guestListItemStyles.verifiedDocument} />
                    )}
                    {!isReadOnly && (
                      <button onClick={onCaptureDocument} className={guestListItemStyles.retakeButton}>
                        {t('buttons.retake')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className={guestListItemStyles.detailsContainer}>
                {renderDetailsFields()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const guestListScreenStyles = {
  container: "flex flex-col min-h-screen bg-white",
  main: "flex-grow p-6 md:p-8 lg:p-10 space-y-4",
  header: "relative text-center",
  title: "text-xl md:text-2xl lg:text-3xl font-bold text-gray-900",
  editButtonContainer: "absolute right-0 top-0 bottom-0 flex items-center",
  editButton: "font-semibold text-black text-base md:text-lg lg:text-xl px-2 py-1 hover:bg-gray-100 rounded-md",
  listContainer: "space-y-4",
  footer: "p-6 md:p-8 lg:p-10 text-center space-y-4",
  footerText: "text-sm md:text-base lg:text-lg text-gray-500",
  poweredByContainer: "pt-4 flex items-center justify-center space-x-1 text-gray-400 text-sm md:text-base lg:text-lg",
  poweredByIcon: "w-12 h-12 text-black",
};

/* ---------------- types / helpers ---------------- */
interface GuestListScreenProps {
  guests?: Guest[];
  token?: string | null;
  bookingId?: number | string;
  bookingRoomId?: number | string;

  onConfirm: (booking?: Booking) => void;
  onBack: () => void;

  onTakePhoto: (guestId: string) => void;
  onCaptureDocument: (guestId: string) => void;

  onAddGuest: () => void;
  onDeleteGuest: (guestId: string) => void;
  onUpdateGuestDetails: (guestId: string, details: Guest['details']) => void;

  isReadOnly?: boolean;
}

type PendingConsentItem =
  | { kind: 'consentCreated'; guestId: number | string; consentId: number | string; action?: string }
  | { kind: 'consentPending'; guestId: number | string; consentPayload: any; action?: string };

const toNumberOrUndef = (v: any): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const toBase64Payload = (value?: string) => {
  const v = String(value ?? '').trim();
  if (!v) return undefined;
  if (v.startsWith('http://') || v.startsWith('https://')) return undefined;
  return v; // data URI or raw base64
};

const unwrapBooking = (resp: any) =>
  resp?.data?.booking ?? resp?.data ?? resp?.booking ?? resp?.payload ?? resp;

const getBookingIdFromQuery = () => {
  try {
    const qs = new URLSearchParams(window.location.search);
    return qs.get('bookingId');
  } catch {
    return null;
  }
};

const readBookingIdFromStorage = () => {
  try {
    return toNumberOrUndef(localStorage.getItem(CHECKIN_BOOKING_ID_KEY));
  } catch {
    return undefined;
  }
};

const getTokenFromQuery = () => {
  try {
    const qs = new URLSearchParams(window.location.search);
    return qs.get('token');
  } catch {
    return null;
  }
};

const getBookingRoomIdFromQuery = () => {
  try {
    const qs = new URLSearchParams(window.location.search);
    return qs.get('bookingRoomId') ?? qs.get('booking_room_id');
  } catch {
    return null;
  }
};

const readBookingRoomIdFromStorage = () => {
  try {
    return toNumberOrUndef(localStorage.getItem(CHECKIN_BOOKING_ROOM_ID_KEY));
  } catch {
    return undefined;
  }
};

// ✅ map response from backend -> Guest[]
const mapApiGuestsToUi = (raw: any): Guest[] => {
  const list = raw?.data ?? raw?.guests ?? raw ?? [];
  if (!Array.isArray(list)) return [];

  return list.map((g: any, idx: number) => {
    const stableId =
      g.guestId ?? g.guest_id ?? g.customer_id ?? g.customerId ?? g.person_id ?? g.personId ?? g.id;

    const id = String(stableId ?? `${idx}`);

    const isMain =
      (g.isMainGuest === true) ||
      (g.is_main_guest === true) ||
      (g.main_guest === true);

    const firstName = g.details?.firstName ?? g.first_name ?? g.firstName ?? '';
    const lastName = g.details?.lastName ?? g.last_name ?? g.lastName ?? '';

    const fullName =
      (g.full_name ?? g.fullName ?? g.name ?? `${firstName} ${lastName}`)?.toString().trim() || `Guest ${idx + 1}`;

    const details = {
      ...(g.details || {}),
      firstName: firstName || g.details?.firstName || '',
      lastName: lastName || g.details?.lastName || '',
      gender: g.details?.gender ?? g.gender ?? '',
      nationality: g.details?.nationality ?? g.nationality ?? '',
      dateOfBirth: g.details?.dateOfBirth ?? g.date_of_birth ?? g.dateOfBirth ?? '',
      documentNumber: g.details?.documentNumber ?? g.id_number ?? g.documentNumber ?? '',
      currentAddress: g.details?.currentAddress ?? g.current_address ?? g.currentAddress ?? '',
    };

    const docTypeRaw = (g.documentType ?? g.id_type ?? '').toString().toUpperCase();
    const documentType =
      docTypeRaw.includes('PASSPORT') ? DocumentType.Passport :
        docTypeRaw.includes('ID') ? DocumentType.IDCard :
          (g.documentType ?? DocumentType.IDCard);

    const faceImage =
      g.faceImage ??
      g.faceImagePath ??
      g.face_image ??
      g.face_image_path ??
      g.face_image_base64 ??
      '';
    const documentImage =
      g.documentImage ??
      g.documentImagePath ??
      g.document_image ??
      g.document_image_path ??
      g.document_image_base64 ??
      '';

    const progress =
      typeof g.progress === 'number'
        ? g.progress
        : (faceImage && documentImage ? 100 : (faceImage ? 50 : 0));

    const bookingRoomId =
      g.bookingRoomId ??
      g.booking_room_id ??
      g.bookingRoomID ??
      undefined;

    const ui: Guest = {
      id,
      name: fullName,
      isMainGuest: isMain,
      progress,
      documentType,
      details,
      faceImage,
      documentImage,
      bookingRoomId,
    } as any;

    return ui;
  });
};

const mapDocumentTypeToApi = (type?: DocumentType) => {
  switch (type) {
    case DocumentType.IDCard:
      return 'ID_CARD';
    case DocumentType.Passport:
      return 'PASSPORT';
    default:
      return undefined;
  }
};

const normalizeDate = (v?: string) => {
  if (!v) return undefined;
  const d = new Date(v);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().split('T')[0];
};

const normalizeName = (v: any) => String(v ?? '').trim().toLowerCase();

const getMainGuestNameFromBooking = (b: any) => {
  const v =
    b?.mainGuest ??
    b?.mainGuestName ??
    b?.guestName ??
    b?.customerName ??
    b?.customer?.full_name ??
    b?.customer?.name ??
    '';
  return String(v ?? '').trim();
};

/* ✅ FIX: filter สำหรับ ViewGuests (isReadOnly) ให้โชว์เฉพาะที่ “กรอกจริง” */
const isMeaningfulGuest = (g: Guest) => {
  if ((g.progress ?? 0) > 0) return true;  // ถ้า progress มากกว่า 0 ก็ถือว่ามีความหมาย
  if (g.faceImage || g.documentImage) return true;  // ถ้ามีรูปใบหน้า หรือ รูปเอกสาร
  const d: any = g.details || {};
  return (
    !!String(d.firstName ?? '').trim() ||
    !!String(d.lastName ?? '').trim() ||
    !!String(d.documentNumber ?? '').trim() ||
    !!String(d.nationality ?? '').trim() ||
    !!String(d.gender ?? '').trim() ||
    !!String(d.dateOfBirth ?? '').trim() ||
    !!String(d.currentAddress ?? '').trim()
  );
};


const GuestListScreen: React.FC<GuestListScreenProps> = ({
  guests: initialGuests = [],
  token: propToken = null,
  bookingId,
  bookingRoomId,
  onConfirm,
  onBack,
  onTakePhoto,
  onCaptureDocument,
  onAddGuest,
  onDeleteGuest,
  onUpdateGuestDetails,
  isReadOnly = false
}) => {
  const { t } = useTranslation();
  const location = useLocation();

  const fetchedRef = useRef(false);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [pendingConsentLogs, setPendingConsentLogs] = useState<PendingConsentItem[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<any>(null);
  const [bookingDetailLoading, setBookingDetailLoading] = useState(false);
  const [bookingDetailError, setBookingDetailError] = useState<string | null>(null);
  const deleteSelectedLabelRaw = t('guestList.deleteSelected');
  const deleteSelectedLabel = deleteSelectedLabelRaw !== 'guestList.deleteSelected'
    ? deleteSelectedLabelRaw
    : (t('buttons.deleteSelectedGuests') !== 'buttons.deleteSelectedGuests'
      ? t('buttons.deleteSelectedGuests')
      : 'Delete Selected');

  // bookingId from state > prop
  const { bookingId: bookingIdFromState } = (location.state || {}) as { bookingId?: number };
  const bookingIdFromQuery = toNumberOrUndef(getBookingIdFromQuery());
  const bookingIdFromStorage = readBookingIdFromStorage();
  const finalBookingId =
    bookingIdFromState ?? bookingId ?? bookingIdFromQuery ?? bookingIdFromStorage;

  const initialToken =
    (location.state as any)?.token ??
    propToken ??
    getTokenFromQuery() ??
    localStorage.getItem('checkin_token');

  const [tokenUsed, setTokenUsed] = useState<string | null>(initialToken ? String(initialToken) : null);
  const [resolvedBookingId, setResolvedBookingId] = useState<number | undefined>(undefined);
  const effectiveBookingId = toNumberOrUndef(resolvedBookingId ?? finalBookingId);
  const bookingRoomIdUsed = useMemo(() => {
    const fromState = (location.state as any)?.bookingRoomId;
    const fromQuery = toNumberOrUndef(getBookingRoomIdFromQuery());
    return (
      toNumberOrUndef(bookingRoomId) ??
      toNumberOrUndef(fromState) ??
      fromQuery ??
      readBookingRoomIdFromStorage()
    );
  }, [bookingRoomId, location.state]);

  // ✅ FIX: bookingId เปลี่ยน -> reset state กันของเก่าค้าง
  useEffect(() => {
    fetchedRef.current = false;
    setGuests([]);
    setFetchError(null);
    setLoading(false);
    setIsEditing(false);
    setSelectedGuestIds([]);
  }, [effectiveBookingId, isReadOnly, location.key]);

  useEffect(() => {
    if (!effectiveBookingId) return;
    try {
      localStorage.setItem(CHECKIN_BOOKING_ID_KEY, String(effectiveBookingId));
    } catch {
      // ignore storage errors
    }
    try {
      const qs = new URLSearchParams(window.location.search);
      qs.set('bookingId', String(effectiveBookingId));
      const newSearch = qs.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    } catch {
      // ignore
    }
  }, [effectiveBookingId]);

  useEffect(() => {
    if (!bookingRoomIdUsed) return;
    try {
      localStorage.setItem(CHECKIN_BOOKING_ROOM_ID_KEY, String(bookingRoomIdUsed));
    } catch {
      // ignore storage errors
    }
  }, [bookingRoomIdUsed]);

  useEffect(() => {
    let mounted = true;
    if (!effectiveBookingId) {
      setBookingDetail(null);
      return;
    }
    setBookingDetailLoading(true);
    setBookingDetailError(null);

    apiService
      .getBookingDetailsById(effectiveBookingId)
      .then((resp: any) => {
        if (!mounted) return;
        setBookingDetail(unwrapBooking(resp));
      })
      .catch((err) => {
        if (!mounted) return;
        setBookingDetailError(err?.message || 'Failed to load booking');
      })
      .finally(() => {
        if (mounted) setBookingDetailLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [effectiveBookingId]);

  useEffect(() => {
    const next =
      (location.state as any)?.token ??
      propToken ??
      getTokenFromQuery() ??
      localStorage.getItem('checkin_token');

    const nextStr = next ? String(next) : null;
    if (nextStr && nextStr !== tokenUsed) setTokenUsed(nextStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propToken, location.state]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const bid = toNumberOrUndef(finalBookingId); // ใช้ finalBookingId หรือ resolvedBookingId สำหรับดึงข้อมูล

      // ถ้ามี finalBookingId ให้ใช้ค่าโดยตรง
      if (bid) {
        if (mounted) setResolvedBookingId(bid);
        return;
      }

      if (isReadOnly) return;

      const token = tokenUsed ? String(tokenUsed).trim() : ''; // ตรวจสอบ tokenUsed
      if (!token) return;

      try {
        const bookingResp: any = await apiService.getBookingByToken(token, bookingRoomIdUsed); // ดึงข้อมูลจาก API ด้วย token
        const bid2 =
          bookingResp?.bookingId ??
          bookingResp?.booking_id ??
          bookingResp?.data?.bookingId ??
          bookingResp?.data?.booking_id ??
          bookingResp?.id ??
          bookingResp?.data?.id;

        const bookingIdNum = toNumberOrUndef(bid2); // แปลงเป็นตัวเลข
        if (bookingIdNum && mounted) setResolvedBookingId(bookingIdNum); // ถ้ามี bookingId ให้เซ็ตค่า
      } catch (err) {
        console.error('Error fetching booking by token', err);
      }
    };

    run();
    return () => { mounted = false; };  // Cleanup function เมื่อ component ถูกทำลาย
  }, [finalBookingId, tokenUsed, isReadOnly]); // useEffect จะรันใหม่เมื่อ finalBookingId หรือ tokenUsed เปลี่ยนแปลง

  // ✅ hydrate จาก cache/props แค่ครั้งแรก แล้วให้ API fetch มาอัปเดตภายหลัง
  useEffect(() => {
    if (isReadOnly) return;
    if (guests.length > 0) return;

    const bid = effectiveBookingId;
    if (bid) {
      const cachedGuests = loadGuestCache(bid);
      if (cachedGuests.length > 0) {
        setGuests(normalizeGuestsForDisplay(cachedGuests));
        return;
      }
    }

    if (initialGuests.length > 0) {
      setGuests(normalizeGuestsForDisplay(initialGuests));
    }
  }, [effectiveBookingId, initialGuests, guests.length]);

  // Sync guest list when parent updates (e.g., Add Guest)
  useEffect(() => {
    if (isReadOnly) return;
    const incoming = normalizeGuestsForDisplay(initialGuests);
    const incomingIds = incoming.map(g => g.id).join('|');
    const localIds = guests.map(g => g.id).join('|');
    if (incomingIds !== localIds) {
      setGuests(incoming);
    }
  }, [initialGuests, guests]);

  // pendingConsentLogs persistence
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pendingConsentLogs");
      if (raw) {
        const stored = JSON.parse(raw);
        if (Array.isArray(stored)) setPendingConsentLogs(stored);
      }
    } catch (e) {
      console.warn("[localStorage] Failed to load pendingConsentLogs:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("pendingConsentLogs", JSON.stringify(pendingConsentLogs));
    } catch (e) {
      console.warn("[localStorage] Failed to save pendingConsentLogs:", e);
    }
  }, [pendingConsentLogs]);

  const allVerified = useMemo(
    () => guests.length > 0 && guests.every(g => g.progress === 100),
    [guests]
  );

  const canAddGuest = useMemo(() => guests.length < 5, [guests]);

  const saveTimerRef = useRef<number | null>(null);

  const saveCacheDebounced = (bookingId: number, nextGuests: Guest[]) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveGuestCache(bookingId, nextGuests);
    }, 300);
  };

 // src/components/screens/GuestListScreen.tsx
const handleUpdateGuestDetails = (guestId: string, details: Guest["details"]) => {
  setGuests(prev => {
    const next = prev.map(g => {
      if (g.id !== guestId) return g;
      const first = details?.firstName?.trim();
      const last = details?.lastName?.trim();
      const finalName = (first || last) ? [first, last].filter(Boolean).join(' ') : g.name;

      return { ...g, details, name: finalName };
    });

    // บันทึกข้อมูลลง localStorage หรือส่งไปยัง backend
    const bid = effectiveBookingId;
    if (bid) saveGuestCache(bid, next); // บันทึกข้อมูลลง localStorage

    return next;
  });

  // แจ้งให้ parent component รับรู้ถึงการอัพเดต
  onUpdateGuestDetails(guestId, details);
};


  // ✅ FETCH guests + normalize (ViewGuests ต้องพึ่ง bookingId นี้เท่านั้น)
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        if (fetchedRef.current) return;

        const bid = effectiveBookingId;
        const token = tokenUsed ? String(tokenUsed).trim() : '';

        if (!bid && !token) return;

        fetchedRef.current = true;
        setLoading(true);
        setFetchError(null);

        if (bid) {
          // ดึงข้อมูลจาก API สำหรับ guest
          const resp = await apiService.fetchGuests(bid);
          if (!mounted) return;

          const backendMapped = mapApiGuestsToUi(resp); // แปลงข้อมูลจาก API
          if (isReadOnly) {
            setGuests(normalizeGuestsForDisplay(backendMapped)); // แสดงผลข้อมูลจาก backend เท่านั้น
            return;
          }

          const cached = loadGuestCache(bid); // โหลดข้อมูลจาก cache
          const merged = mergeGuestsPreferCache(backendMapped, cached);
          setGuests(normalizeGuestsForDisplay(merged)); // แสดงผลข้อมูล
          return;
        }

        if (token) {
          const bookingResp: any = await (apiService as any).getBookingByToken(token, bookingRoomIdUsed);
          const bid2 =
            bookingResp?.bookingId ??
            bookingResp?.booking_id ??
            bookingResp?.data?.bookingId ??
            bookingResp?.data?.booking_id ??
            bookingResp?.id ??
            bookingResp?.data?.id;

          const bookingIdNum2 = toNumberOrUndef(bid2); // แปลงเป็นตัวเลข
          if (!bookingIdNum2) throw new Error('หา bookingId จาก token ไม่ได้');

          const resp = await apiService.fetchGuests(bookingIdNum2); // ดึงข้อมูล guests
          if (!mounted) return;

          const backendMapped = mapApiGuestsToUi(resp);
          if (isReadOnly) {
            setGuests(normalizeGuestsForDisplay(backendMapped)); // แสดงผลข้อมูลจาก backend เท่านั้น
            return;
          }

          const cached = loadGuestCache(bookingIdNum2);
          const merged = mergeGuestsPreferCache(backendMapped, cached);
          setGuests(normalizeGuestsForDisplay(merged)); // แสดงผลข้อมูล
          return;
        }

      } catch (err: any) {
        if (!mounted) return;
        fetchedRef.current = false;
        setFetchError(err?.message ?? 'โหลดรายชื่อไม่สำเร็จ'); // แจ้ง error
      } finally {
        if (mounted) setLoading(false); // เปลี่ยนสถานะ loading
      }
    };

    run();
    return () => { mounted = false; };
  }, [effectiveBookingId, tokenUsed, isReadOnly, bookingRoomIdUsed]);

  const handleRetry = () => {
    fetchedRef.current = false;
    setFetchError(null);
    setGuests([]);
  };

  const flushPendingConsentLogsForBooking = async (resolvedBookingIdRaw?: number | string) => {
    if (!pendingConsentLogs || pendingConsentLogs.length === 0) return;
    const resolvedBookingId = toNumberOrUndef(resolvedBookingIdRaw);
    if (!resolvedBookingId) return;

    const pendingSnapshot = [...pendingConsentLogs];
    setPendingConsentLogs([]);

    for (const item of pendingSnapshot) {
      try {
        if (item.kind === 'consentPending') {
          const payload = { ...(item.consentPayload || {}), bookingId: resolvedBookingId };
          const acceptResp: any = await apiService.acceptConsent(payload);
          const consentLogId = acceptResp?.consent_log_id ?? acceptResp?.id ?? acceptResp?.consentLogId ?? null;
          if (!consentLogId) throw new Error('acceptConsent returned no consent_log_id');
        } else if (item.kind === 'consentCreated') {
          await apiService.createConsentLog({
            bookingId: resolvedBookingId,
            consentId: item.consentId,
            guestId: item.guestId,
            action: item.action ?? 'accepted',
          });
        }
      } catch (err) {
        console.warn('[flush] failed to flush item, requeueing', item, err);
        setPendingConsentLogs(prev => [...prev, item]);
      }
    }
  };

  const handleConfirm = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    setSaving(true);

    try {
      // 1️⃣ ตรวจสอบว่าเรามี bookingId หรือไม่
      const bookingIdNum = effectiveBookingId;
      if (!bookingIdNum) throw new Error('ไม่พบ bookingId');

      // 2️⃣ ตรวจสอบว่า token มีหรือไม่
      if (!tokenUsed) throw new Error('ไม่พบ token การเช็คอิน กรุณาเริ่มใหม่จากหน้าใส่โค้ด');

      // 3️⃣ ตรวจสอบว่ามี guests หรือไม่
      if (!guests.length) throw new Error('ไม่มีรายชื่อผู้เข้าพัก');

      await flushPendingConsentLogsForBooking(bookingIdNum); // ล้างข้อมูล consent

      const createdGuests: any[] = [];

      // 4️⃣ สร้าง guests (ข้ามผู้เข้าพักที่ขาดชื่อ)
      for (const g of guests) {
        if (!g.details?.firstName || !g.details?.lastName) {
          console.warn('[GuestList] skip createGuest – missing name', g);
          continue; // ถ้าขาดชื่อให้ข้ามไป
        }

        const payload = {
          bookingId: bookingIdNum,
          bookingRoomId: bookingRoomIdUsed ?? undefined,
          fullName: g.name,
          isMainGuest: !!g.isMainGuest,
          dateOfBirth: normalizeDate(g.details?.dateOfBirth),
          gender: g.details?.gender,
          nationality: g.details?.nationality,
          currentAddress: g.details?.currentAddress,
          documentType: mapDocumentTypeToApi(g.documentType),
          documentNumber: g.details?.documentNumber,
          faceImageBase64: toBase64Payload(g.faceImage),
          documentImageBase64: toBase64Payload(g.documentImage),
        };

        const created = await apiService.createGuest(payload);

        const id = created?.id ?? created?.guestId;
        if (!id) throw new Error('Guest creation failed');
        createdGuests.push({ ...created, id }); // เก็บ guest ที่ถูกสร้าง
      }

      // 5️⃣ ยืนยัน consent
      for (const cg of createdGuests) {
        await apiService.acceptConsent({
          guestId: cg.id,
          bookingId: bookingIdNum,
          consentId: CONSENT_ID,
          action: 'accepted',
        });
      }

      // 6️⃣ ยืนยันการเช็คอิน
      await apiService.saveCheckIn({ token: tokenUsed });

      // 7️⃣ รีเฟรชข้อมูล guests
      try {
        const resp = await apiService.fetchGuests(bookingIdNum); // ดึงข้อมูล guests
        const backendGuests = mapApiGuestsToUi(resp);

        const merged = mergeGuestsPreferCache(backendGuests, guests); // ผสมข้อมูลจาก API และ cache
        const normalized = normalizeGuestsForDisplay(merged);

        saveGuestCache(bookingIdNum, normalized); // เก็บข้อมูลใน cache
        setGuests(normalized); // อัพเดต state ของ guests
      } catch {
        saveGuestCache(bookingIdNum, guests); // ถ้าเกิด error ให้เก็บข้อมูลเดิม
      }

      // 8️⃣ ดึงข้อมูล booking ที่สมบูรณ์จาก API
      const fullBooking: Booking = await (apiService as any).getBookingByToken(tokenUsed, bookingRoomIdUsed);

      setSaveSuccess('บันทึกสำเร็จ'); // แสดงข้อความสำเร็จ
      onConfirm(fullBooking); // เรียกฟังก์ชัน onConfirm ที่ได้รับจาก props

    } catch (err: any) {
      console.error('[GuestList] confirm failed', err);
      setSaveError(err?.message ?? 'การบันทึกล้มเหลว'); // แสดงข้อความผิดพลาด
    } finally {
      setSaving(false); // ปิดสถานะการบันทึก
    }
  };


  // ✅ FIX: ตัวนี้ใช้ render จริง (ViewGuests = isReadOnly)
  const displayGuests = useMemo(() => {
    let normalized = normalizeGuestsForDisplay(guests);
    if (isReadOnly && bookingRoomIdUsed) {
      normalized = normalized.filter((g) => {
        const v = toNumberOrUndef((g as any).bookingRoomId ?? (g as any).booking_room_id);
        return v === bookingRoomIdUsed;
      });
    }
    if (!isReadOnly) return normalized; // ถ้าไม่เป็น read-only ก็แสดงข้อมูลทั้งหมด

    const mainGuestName = getMainGuestNameFromBooking(bookingDetail);
    const normalizedMain = normalizeName(mainGuestName);
    let aligned = normalized;
    if (normalizedMain) {
      const hasMatch = normalized.some((g) => normalizeName(g.name) === normalizedMain);
      if (hasMatch) {
        aligned = normalized.map((g) => ({
          ...g,
          isMainGuest: normalizeName(g.name) === normalizedMain,
        }));
      }
    }

    return aligned.filter(isMeaningfulGuest); // กรองข้อมูลที่มีการกรอกจริง
  }, [guests, isReadOnly, bookingDetail, bookingRoomIdUsed]);

  // ✅ ลบผู้เข้าพักที่เลือก (ลบจาก state + cache + แจ้ง parent)
 // เมื่อมีการลบหรือแก้ไขข้อมูล
const handleConfirmDeleteSelected = async () => {
  if (deletingSelected) return;
  if (!selectedGuestIds || selectedGuestIds.length === 0) {
    setShowDeleteConfirm(false);
    return;
  }

  setDeletingSelected(true);

  try {
    // 1) ลบจาก state (กัน main guest ไว้ชัวร์)
    setGuests(prev => {
      const next = (prev ?? []).filter(g => g.isMainGuest || !selectedGuestIds.includes(g.id));

      // 2) sync cache ตาม bookingId
      const bid = effectiveBookingId;
      if (bid) {
        // เซฟทันทีเพื่อไม่ให้ “ของเก่ากลับมา”
        saveGuestCache(bid, next); // บันทึกข้อมูลที่อัพเดตใน localStorage
      }

      return next;
    });

    // 3) แจ้ง parent เผื่อมันมี state/logic อื่น
    selectedGuestIds.forEach((id) => {
      try { onDeleteGuest(id); } catch { /* ignore */ }
    });

    // 4) reset UI
    setSelectedGuestIds([]);
    setShowDeleteConfirm(false);
    setIsEditing(false);

  } finally {
    setDeletingSelected(false);
  }
};


  return (
    <div className={guestListScreenStyles.container}>
      <Header
        onBack={onBack}
        logoClassName="w-32 h-32 md:w-36 md:h-36"
      />

      <main className={guestListScreenStyles.main}>
        <div className={guestListScreenStyles.header}>
          <h1 className={guestListScreenStyles.title}>{t('guestList.title') || 'Guest Details'}</h1>

          {!isReadOnly && (
            <div className={guestListScreenStyles.editButtonContainer}>
              <button
                onClick={() => {
                  setIsEditing(!isEditing);
                  if (isEditing) setSelectedGuestIds([]);
                }}
                className={guestListScreenStyles.editButton}
              >
                {isEditing ? (t('buttons.done') || 'Done') : (t('guestList.edit') || 'Edit')}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-6 text-center text-gray-500">{t('guestList.loading') || 'Loading guests...'}</div>
        ) : fetchError ? (
          <div className="py-6 text-center text-red-500">
            <div>{fetchError}</div>
            <div className="flex items-center justify-center gap-3 mt-3">
              <Button onClick={handleRetry}>{t('guestList.retry') || 'Retry'}</Button>
            </div>
          </div>
        ) : displayGuests.length === 0 ? (
          <div className="py-6 text-center text-gray-500">{t('guestList.noGuests') || 'No guests found.'}</div>
        ) : (
          <div className={guestListScreenStyles.listContainer}>
            {displayGuests.map(guest => (
              <GuestListItem
                key={guest.id}
                guest={guest}
                isEditing={isEditing && !isReadOnly}
                isSelected={selectedGuestIds.includes(guest.id)}
                onSelectToggle={() => {
                  // ✅ main guest ห้ามเลือก
                  if (guest.isMainGuest) return;

                  setSelectedGuestIds(prev =>
                    prev.includes(guest.id)
                      ? prev.filter(id => id !== guest.id)
                      : [...prev, guest.id]
                  );
                }}
                onTakePhoto={() => onTakePhoto(guest.id)}
                onCaptureDocument={() => onCaptureDocument(guest.id)}
                onUpdateDetails={(details) => handleUpdateGuestDetails(guest.id, details)}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        )}
      </main>

      <div className={guestListScreenStyles.footer}>
        {!isReadOnly && (
          <div className="space-y-4">
            {!isEditing && (
              <Button onClick={onAddGuest} disabled={!canAddGuest || loading} variant="secondary">
                {t('buttons.addGuest') || '+ ADD GUEST'}
              </Button>
            )}

            {isEditing && (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={selectedGuestIds.length === 0 || deletingSelected}
                className={`w-full ${selectedGuestIds.length === 0 ? 'bg-gray-400 text-white' : 'bg-black text-white hover:bg-gray-800'}`}
              >
                {deleteSelectedLabel}
              </Button>
            )}

            {!isEditing && (
              <Button
                onClick={handleConfirm}
                disabled={!allVerified || loading || saving || !tokenUsed}
              >
                {saving ? (t('guestList.saving') || 'Saving...') : (t('buttons.confirm') || 'CONFIRM')}
              </Button>
            )}

            {saveError && <div className="text-sm text-red-500">{saveError}</div>}
            {saveSuccess && <div className="text-sm text-green-600">{saveSuccess}</div>}
          </div>
        )}

        <p className={guestListScreenStyles.footerText}>{t('guestList.footerText')}</p>

        <div className={guestListScreenStyles.poweredByContainer}>
          <span>{t('footer.poweredBy')}</span>
          <CloudIcon className={guestListScreenStyles.poweredByIcon} />
        </div>
      </div>

      {/* ✅ Delete Confirm Modal */}
      {/* ✅ Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="pt-6 px-6 text-center">
            <h2 className="text-lg font-bold tracking-wide">{t('guestList.deleteTitle')}</h2>
          </div>

          <div className="px-6 mt-6">
            <div className="bg-red-50 rounded-2xl p-5 text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-red-500 flex items-center justify-center">
                  <span className="text-red-500 font-bold">!</span>
                </div>
              </div>

              <p className="text-sm font-semibold text-gray-900">
                {t('guestList.deleteMessage', { selectedGuestIds: selectedGuestIds.length })}
              </p>

              {/* New message explaining the action */}
              <p className="text-xs text-gray-500">
                {t('guestList.deleteWarning')}
              </p>
            </div>
          </div>

          <div className="flex-grow" />

          <div className="px-6 pb-6 space-y-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deletingSelected}
            >
              {t('buttons.cancel')}
            </Button>

            <Button
              onClick={handleConfirmDeleteSelected}
              disabled={selectedGuestIds.length === 0 || deletingSelected}
            >
              {deletingSelected ? 'DELETING...' : 'CONFIRM (DELETE)'}
            </Button>
          </div>

          <div className="pb-4 text-center text-xs text-gray-400">
            {t('footer.poweredBy')}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestListScreen;
