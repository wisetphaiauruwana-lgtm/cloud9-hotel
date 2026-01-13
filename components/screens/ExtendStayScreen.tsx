
import React, { useState, useMemo } from 'react';
import { Booking } from '../../types';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Button from '../ui/Button';
import { useTranslation } from '../../hooks/useTranslation';

interface ExtendStayScreenProps {
  booking: Booking;
  onConfirm: (hours: number) => void;
  onBack: () => void;
}

const detailRowStyles = {
    container: "flex justify-between items-center py-2 md:py-3 lg:py-4 border-b border-gray-200 last:border-0",
    label: "text-gray-500 md:text-base lg:text-lg",
    value: "font-semibold text-base md:text-lg lg:text-xl text-gray-900",
    valueHighlighted: "text-lg md:text-xl lg:text-2xl text-black",
};

const DetailRow: React.FC<{ label: string; value: string; isHighlighted?: boolean }> = ({ label, value, isHighlighted = false }) => (
    <div className={detailRowStyles.container}>
        <span className={detailRowStyles.label}>{label}</span>
        <span className={`${detailRowStyles.value} ${isHighlighted ? detailRowStyles.valueHighlighted : ''}`}>{value}</span>
    </div>
);

const screenStyles = {
    container: "flex flex-col min-h-screen bg-white",
    main: "flex-grow p-6 md:p-8 lg:p-10 space-y-6 md:space-y-8 lg:space-y-10",
    title: "text-xl md:text-2xl lg:text-3xl font-bold text-center tracking-wider text-gray-900",
    checkoutInfoCard: "bg-white p-4 md:p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-200",
    hourSelectionContainer: "space-y-4",
    hourSelectionLabel: "font-semibold text-gray-700 md:text-lg lg:text-xl",
    hourGrid: "grid grid-cols-4 gap-3",
    hourButtonBase: "p-4 md:p-5 lg:p-6 rounded-lg text-center font-bold md:text-lg lg:text-xl transition-colors border",
    hourButtonSelected: "bg-black text-white border-black ring-2 ring-offset-2 ring-black ring-offset-white",
    hourButtonUnselected: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
    footer: "p-6 md:p-8 lg:p-10 sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100",
};

const ExtendStayScreen: React.FC<ExtendStayScreenProps> = ({ booking, onConfirm, onBack }) => {
  const [extensionHours, setExtensionHours] = useState(1);
  const { t } = useTranslation();
  
  const newCheckoutTime = useMemo(() => {
    const [datePart, timePart] = booking.stay.to.split(', ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    const d = new Date(year, month - 1, day, hours, minutes);
    d.setHours(d.getHours() + extensionHours);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [booking.stay.to, extensionHours]);

  const handleConfirm = () => { if (extensionHours > 0) onConfirm(extensionHours); };
  const hourOptions = [1, 2, 3, 4];

  return (
    <div className={screenStyles.container}>
      <Header onBack={onBack} />
      <main className={screenStyles.main}>
        <h1 className={screenStyles.title}>{t('extendStay.title')}</h1>
        <div className={screenStyles.checkoutInfoCard}>
            <DetailRow label={t('extendStay.currentCheckout')} value={booking.stay.to} />
            <DetailRow label={t('extendStay.newCheckout')} value={newCheckoutTime} isHighlighted />
        </div>
        <div className={screenStyles.hourSelectionContainer}>
            <p className={screenStyles.hourSelectionLabel}>{t('extendStay.selectHours')}</p>
            <div className={screenStyles.hourGrid}>
                {hourOptions.map(hour => (
                    <button 
                        key={hour}
                        onClick={() => setExtensionHours(hour)}
                        className={`${screenStyles.hourButtonBase} ${ extensionHours === hour ? screenStyles.hourButtonSelected : screenStyles.hourButtonUnselected }`}
                    >
                        {t('extendStay.hour', { hour })}
                    </button>
                ))}
            </div>
        </div>
      </main>
      <div className={screenStyles.footer}>
        <Button onClick={handleConfirm} disabled={extensionHours <= 0}>
          {t('buttons.confirmExtension')}
        </Button>
      </div>
      <Footer />
    </div>
  );
};

export default ExtendStayScreen;
