
import React from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Button from '../ui/Button';
import { CheckCircleIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';

interface CheckoutSuccessScreenProps {
  onFinish: () => void;
}

const styles = {
    container: "flex flex-col min-h-screen bg-white",
    main: "flex-grow flex flex-col items-center justify-center p-6 md:p-10 lg:p-16 text-center space-y-4",
    icon: "w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 text-green-500 mb-4",
    title: "text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900",
    text: "text-gray-500 md:text-lg lg:text-xl",
    footer: "p-6 md:p-8 lg:p-10",
};

const CheckoutSuccessScreen: React.FC<CheckoutSuccessScreenProps> = ({ onFinish }) => {
    const { t } = useTranslation();
    return ( 
        <div className={styles.container}>
            <Header />
            <main className={styles.main}>
                <CheckCircleIcon className={styles.icon} />
                <h1 className={styles.title}>{t('checkoutSuccess.title')}</h1>
                <p className={styles.text}>{t('checkoutSuccess.line1')}</p>
                <p className={styles.text}>{t('checkoutSuccess.line2')}</p>
            </main>
            <div className={styles.footer}>
                <Button onClick={onFinish}>{t('buttons.backToHome')}</Button>
            </div>
            <Footer />
        </div>
    )
};

export default CheckoutSuccessScreen;