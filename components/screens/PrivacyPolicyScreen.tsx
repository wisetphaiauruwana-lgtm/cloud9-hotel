
import React from 'react';
import { CloudIcon } from '../icons/Icons';
import Header from '../layout/Header';
import { useTranslation } from '../../hooks/useTranslation';

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

const styles = {
  container: "flex flex-col min-h-screen bg-white",
  main: "flex-grow p-6 md:p-8 lg:p-12",
  logoContainer: "flex flex-col items-center justify-center mb-8",
  logoIcon: "w-32 h-32 md:w-36 md:h-36",
  logoText: "font-bold text-3xl md:text-4xl mt-2 text-black",
  introText: "mb-6 text-sm md:text-base lg:text-lg text-gray-600",
  content: "space-y-6 text-sm md:text-base lg:text-lg text-gray-800",
  sectionTitle: "font-bold mb-2 text-base md:text-lg lg:text-xl text-gray-900",
  sectionText: "mb-2 text-gray-600",
  list: "list-disc list-inside space-y-1 text-gray-600 pl-2",
};

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ onBack }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <Header onBack={onBack} showLogo={false} />
      <main className={styles.main}>
        <div className={styles.logoContainer}>
            <CloudIcon className={styles.logoIcon} />
        </div>
        
        <p 
          className={styles.introText}
          dangerouslySetInnerHTML={{ __html: t('privacyPolicy.intro') }}
        />

        <div className={styles.content}>
            <section>
                <h2 className={styles.sectionTitle}>{t('privacyPolicy.section1Title')}</h2>
                <p className={styles.sectionText}>{t('privacyPolicy.section1Text')}</p>
                <ul className={styles.list}>
                    {t('privacyPolicy.section1List').map((item: string, index: number) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </section>
            <section>
                <h2 className={styles.sectionTitle}>{t('privacyPolicy.section2Title')}</h2>
                <p className={styles.sectionText}>{t('privacyPolicy.section2Text')}</p>
                <ul className={styles.list}>
                    {t('privacyPolicy.section2List').map((item: string, index: number) => (
                       <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
                    ))}
                </ul>
            </section>
            <section>
                <h2 className={styles.sectionTitle}>{t('privacyPolicy.section3Title')}</h2>
                <ul className={styles.list}>
                    {t('privacyPolicy.section3List').map((item: string, index: number) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </section>
            <section>
                <h2 className={styles.sectionTitle}>{t('privacyPolicy.section4Title')}</h2>
                <p className={styles.sectionText}>{t('privacyPolicy.section4Text')}</p>
                <ul className={styles.list}>
                     {t('privacyPolicy.section4List').map((item: string, index: number) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicyScreen;
