
import { useLanguage } from '../context/LanguageContext';

// Helper function to get nested properties from an object using a string path
const get = (obj: any, path: string): any => {
  const keys = path.split('.');
  // Fallback to the key itself if not found, so the UI doesn't break
  return keys.reduce((acc, key) => (acc && typeof acc[key] !== 'undefined' ? acc[key] : path), obj);
}

export const useTranslation = () => {
  const { language, translations } = useLanguage();
  
  const t = (key: string, replacements?: Record<string, string | number>): any => {
    let translation = get(translations, key);

    // Handle non-string translations like arrays for lists
    if (typeof translation !== 'string') {
        return translation;
    }

    // Handle dynamic value replacement
    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        const value = replacements[placeholder];
        // Support both double-brace ({{name}}) and single-brace ({name}) placeholders.
        const regexDouble = new RegExp(`{{\\s*${placeholder}\\s*}}`, 'g');
        const regexSingle = new RegExp(`{\\s*${placeholder}\\s*}`, 'g');
        translation = translation.replace(regexDouble, String(value));
        translation = translation.replace(regexSingle, String(value));
      });
    }

    return translation;
  };

  return { t, currentLanguage: language };
};