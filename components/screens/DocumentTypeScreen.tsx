// src/components/screens/DocumentTypeScreen.tsx
import React from 'react';
import { DocumentType } from '../../types';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { useTranslation } from '../../hooks/useTranslation';
import { ThaiIdIcon, PassportIcon } from '../icons/Icons';

/* =====================
   Button Component
===================== */
const DocumentTypeButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="
      w-full
      bg-gray-100
      rounded-2xl
      py-6
      flex
      flex-col
      items-center
      justify-center
      space-y-3
      hover:bg-gray-200
      transition
    "
  >
    {icon}
    <span className="text-sm font-medium text-gray-900">
      {label}
    </span>
  </button>
);

/* =====================
   Screen
===================== */
const DocumentTypeScreen: React.FC<{
  onSelect: (type: DocumentType) => void;
  onBack: () => void;
}> = ({ onSelect, onBack }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <Header onBack={onBack} />

      <main className="flex-grow px-4 sm:px-6">
        <div
          className="
            w-full
            flex
            flex-col
            items-center
            text-center
            pt-6
            space-y-6
          "
        >
          {/* Logo */}
          <div className="flex flex-col items-center">
          </div>

          {/* Title */}
          <h1 className="text-sm font-bold tracking-widest text-gray-900">
            {t('documentType.title') || 'CHOOSE DOCUMENT TYPE'}
          </h1>

          {/* Buttons (Full width) */}
          <div className="w-full space-y-4 pt-2">
            <DocumentTypeButton
              icon={<ThaiIdIcon className="w-12 h-12" />}
              label={t('documentType.thaiId') || 'Thai ID Card'}
              onClick={() => onSelect(DocumentType.IDCard)}
            />

            <DocumentTypeButton
              icon={<PassportIcon className="w-12 h-12" />}
              label={t('documentType.passport') || 'Oversea Passport'}
              onClick={() => onSelect(DocumentType.Passport)}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DocumentTypeScreen;
