
import React from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Button from '../ui/Button';
import { useTranslation } from '../../hooks/useTranslation';

interface WelcomeScreenProps {
  onStart: () => void;
}

const styles = {
  container: "flex flex-col min-h-screen bg-white",
  main: "flex-grow flex flex-col items-center justify-center px-6 py-10 text-center",
  content: "space-y-3 max-w-[360px]",
  title: "text-base sm:text-lg font-bold tracking-[0.2em] text-gray-900",
  subtitle: "text-gray-500 text-xs sm:text-sm leading-relaxed",
  buttonContainer: "px-6 pb-8 w-full flex justify-center",
  buttonWrap: "w-full max-w-[320px]",
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <Header />
      <main className={styles.main}>
        <div className={styles.content}>
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
