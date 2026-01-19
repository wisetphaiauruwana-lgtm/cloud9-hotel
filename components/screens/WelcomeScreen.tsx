
import React from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Button from '../ui/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { CloudIcon } from '../icons/Icons';

interface WelcomeScreenProps {
  onStart: () => void;
}

const styles = {
  container: "flex flex-col min-h-screen bg-white",
  main: "flex-grow flex flex-col items-center justify-center px-6 py-8 text-center",
  content: "space-y-4 max-w-[360px] md:max-w-[600px] lg:max-w-[720px]",
  brand: "flex flex-col items-center gap-2",
  brandText: "text-3xl md:text-4xl font-bold tracking-widest text-gray-900",
  title: "text-xs font-bold tracking-[0.22em] text-gray-900",
  subtitle: "text-gray-500 text-xs leading-relaxed",
  buttonContainer: "px-6 pb-6 w-full flex justify-center",
  buttonWrap: "w-full max-w-[360px] md:max-w-[600px] lg:max-w-[720px]",
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <Header compact showLogo={false} showBorder={false} />
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.brand}>
            <CloudIcon className="w-24 h-24 md:w-28 md:h-28" />
          </div>
          <h1 className={styles.title}>{t('welcome.title') || "READY TO BEGIN YOUR CHECK-IN?"}</h1>
          <p className={styles.subtitle}>{t('welcome.subtitle') || "Your seamless check-in experience starts here."}</p>
        </div>
      </main>
      <div className={styles.buttonContainer}>
        <div className={styles.buttonWrap}>
          <Button onClick={onStart}>{t('buttons.startCheckin') || "START CHECK-IN"}</Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default WelcomeScreen;
