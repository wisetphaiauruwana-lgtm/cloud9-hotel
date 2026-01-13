
import React from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Button from '../ui/Button';
import { AlertCircleIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';

interface CheckoutScreenProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const styles = {
  container: "flex flex-col min-h-screen bg-white",
  main: "flex-grow flex flex-col items-center justify-center p-6 text-center space-y-6",
  title: "text-xl font-bold text-gray-900",
  chargesCard: "w-full bg-gray-50 p-4 rounded-lg text-left border border-gray-200",
  chargesHeader: "flex justify-between items-center",
  chargesLabel: "font-bold text-gray-700",
  chargesAmount: "font-bold text-xl text-gray-900",
  chargesDescription: "text-sm text-gray-500 mt-1",
  warningBox: "bg-red-50 border border-red-100 text-red-800 text-sm p-4 rounded-lg flex items-start space-x-3",
  warningIcon: "w-5 h-5 text-red-500 mt-0.5 flex-shrink-0",
  warningText: "text-left",
  footer: "p-6 space-y-3",
};

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ onConfirm, onCancel }) => {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <Header />
      <main className={styles.main}>
        <h1 className={styles.title}>{t('checkout.title')}</h1>
        
        <div className={styles.warningBox}>
            <AlertCircleIcon className={styles.warningIcon} />
            <p className={styles.warningText}>{t('checkout.warning')}</p>
        </div>

      </main>
      <div className={styles.footer}>
        <Button onClick={onConfirm} variant="danger">
            {t('buttons.confirmCheckout')}
        </Button>
        <Button onClick={onCancel} variant="secondary">
            {t('buttons.cancel')}
        </Button>
      </div>
      <Footer />
    </div>
  );
};

export default CheckoutScreen;
