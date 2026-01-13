
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';

type Language = 'en' | 'th';
type Translations = Record<string, any>;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: Translations;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translations>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchTranslations = useCallback(async (lang: Language) => {
    try {
      const response = await fetch(`/locales/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${lang}.json`);
      }
      const data = await response.json();
      setTranslations(data);
    } catch (error) {
      console.error("Error fetching translation file:", error);
      // If a language fails, we'll just keep the old translations.
    }
  }, []);
  
  // Effect for the very first application load
  useEffect(() => {
    fetchTranslations('en').finally(() => {
      setIsInitialLoading(false);
    });
  }, [fetchTranslations]);

  // This is the function that components will call to change language.
  const setLanguage = (lang: Language) => {
    // Don't do anything if the language is already the same
    if (lang === language) return;
    
    // Set the new language state
    setLanguageState(lang);
    // Fetch the new translations in the background. 
    // This will not trigger the initial loading state.
    fetchTranslations(lang);
  };
  
  // Only return null during the initial application load.
  // This prevents the app from rendering with untranslated text or keys.
  if (isInitialLoading) {
    return null; 
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations, isLoading: isInitialLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
