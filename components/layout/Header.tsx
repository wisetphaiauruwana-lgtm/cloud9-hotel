
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeftIcon, CloudIcon, ChevronDownIcon } from '../icons/Icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslation } from '../../hooks/useTranslation';


interface HeaderProps {
  onBack?: () => void;
  title?: string;
  compact?: boolean;
  showLogo?: boolean;
  showBorder?: boolean;
  logoClassName?: string;
  logoTextClassName?: string;
}

const styles = {
  header: "relative flex items-center justify-center p-4 md:p-6 lg:p-8 bg-white",
  headerCompact: "py-3 px-4",
  headerBorder: "border-b border-gray-100",
  backButton: "absolute left-4 md:left-6 lg:left-8 text-gray-500 hover:text-black transition-colors",
  logoContainer: "flex flex-col items-center gap-0.5 text-black",
  logoText: "font-bold text-2xl md:text-3xl tracking-widest",
  langSwitcher: "absolute right-4 md:right-6 lg:right-8",
  langButton: "flex items-center space-x-1 text-gray-600 font-semibold hover:text-black transition-colors",
  langDropdown: "absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-20",
  langOption: "px-4 py-2 text-left w-full text-gray-700 hover:bg-gray-50",
};

const Header: React.FC<HeaderProps> = ({
  onBack,
  compact = false,
  showLogo = true,
  showBorder = true,
  logoClassName,
  logoTextClassName,
}) => {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (lang: 'en' | 'th') => {
    setLanguage(lang);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const headerClass = [
    styles.header,
    compact ? styles.headerCompact : "",
    showBorder ? styles.headerBorder : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClass}>
      {onBack && (
        <button onClick={onBack} className={styles.backButton}>
          <ArrowLeftIcon className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
        </button>
      )}
      {showLogo && (
        <div className={styles.logoContainer}>
          <CloudIcon className={logoClassName || "w-16 h-16 md:w-20 md:h-20"} />
          <span className={logoTextClassName || "font-bold text-3xl md:text-4xl tracking-widest"}>cloud9</span>
        </div>
      )}

      <div className={styles.langSwitcher} ref={dropdownRef}>
        <button onClick={() => setIsOpen(!isOpen)} className={styles.langButton}>
          <span>{language.toUpperCase()}</span>
          <ChevronDownIcon className="w-4 h-4" />
        </button>
        {isOpen && (
          <div className={styles.langDropdown}>
            <button onClick={() => handleLanguageChange('en')} className={styles.langOption}>{t('header.english')}</button>
            <button onClick={() => handleLanguageChange('th')} className={styles.langOption}>{t('header.thai')}</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
