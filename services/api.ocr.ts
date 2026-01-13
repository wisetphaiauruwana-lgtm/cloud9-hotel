import { ENDPOINTS } from './api.constants';
import { parseJsonSafe, base64ToBlob, normalizeApiError } from './api.helpers';
import type { ExtractedData } from '../types';


export const verifyIDCard = async (base64Image: string): Promise<ExtractedData> => {
  const fd = new FormData();
  const file = new File([base64ToBlob(base64Image)], "id_card.jpg", { type: "image/jpeg" });
  fd.append('id_card_file', file);

  const res = await fetch(ENDPOINTS.VERIFY_IDCARD, { method: 'POST', body: fd });
  const data = await parseJsonSafe(res) as any;
  if (!res.ok || data?.status === 'error' || !data?.data) {
    const msg = normalizeApiError(data, 'ID Card OCR failed');
    throw new Error(msg);
  }
  const result = data.data;
  const fullNameWithPrefix = result.title_name_surname_th?.value || '';
  let nameString = fullNameWithPrefix.trim();
  let genderCode = 'Unknown';
  const prefixes = ['นาย', 'นาง', 'นางสาว', 'น.ส.', 'เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.'];
  const malePrefixes = ['นาย', 'เด็กชาย', 'ด.ช.'];
  const femalePrefixes = ['นาง', 'นางสาว', 'น.ส.', 'เด็กหญิง', 'ด.ญ.'];
  const foundPrefix = prefixes.find(p => nameString.startsWith(p + ' '));
  if (foundPrefix) {
    nameString = nameString.substring(foundPrefix.length).trim();
    if (malePrefixes.includes(foundPrefix)) genderCode = 'Male';
    if (femalePrefixes.includes(foundPrefix)) genderCode = 'Female';
  }
  const nameParts = nameString.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  return {
    documentNumber: result.id_number?.value || '',
    firstName,
    lastName,
    nationality: result.nationality?.value || 'Thai',
    gender: genderCode,
    currentAddress: result.address_full?.value || '',
    dateOfBirth: result.dob_th?.value || '',
  } as ExtractedData;
};

export const verifyPassport = async (base64Image: string): Promise<ExtractedData> => {
  const fd = new FormData();
  const file = new File([base64ToBlob(base64Image)], "passport.jpg", { type: "image/jpeg" });
  fd.append('passport_file', file);

  const res = await fetch(ENDPOINTS.VERIFY_PASSPORT, { method: 'POST', body: fd });
  const data = await parseJsonSafe(res) as any;
  if (!res.ok || data?.status === 'error' || !data?.data) {
    const msg = normalizeApiError(data, 'Passport OCR failed');
    throw new Error(msg);
  }

  const result = data.data;
  return {
    documentNumber: result.passport_number?.value || '',
    firstName: result.title_name_en?.value || '',
    lastName: result.surname_en?.value || '',
    nationality: result.nationality?.value || '',
    gender: result.sex?.value || '',
    dateOfBirth: result.date_of_birth?.value || '',
    dateOfArrival: result.date_of_arrival?.value || '',
    visaType: result.visa_type?.value || '',
    stayExpiryDate: result.stay_expiry_date?.value || '',
    pointOfEntry: result.point_of_entry?.value || '',
    tmCardNumber: result.tm_card_number?.value || '',
  } as ExtractedData;
};
