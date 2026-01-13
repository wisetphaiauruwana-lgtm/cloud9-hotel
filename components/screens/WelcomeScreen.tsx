
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
  main: "flex-grow flex flex-col items-center justify-center p-6 md:p-10 lg:p-16 text-center",
  content: "space-y-4 md:space-y-6 lg:space-y-8",
  title: "text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900",
  subtitle: "text-gray-500 text-base md:text-lg lg:text-xl",
  buttonContainer: "p-6 md:p-8 lg:p-10 w-full",
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <Header />
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>{t('welcome.title')}</h1>
          <p className={styles.subtitle}>{t('welcome.subtitle')}</p>
        </div>
      </main>
      <div className={styles.buttonContainer}>
        <Button onClick={onStart}>{t('buttons.startCheckin')}</Button>
      </div>
      <Footer />
    </div>
  );
};

export default WelcomeScreen;
