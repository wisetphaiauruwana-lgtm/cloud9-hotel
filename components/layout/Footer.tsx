
import React from 'react';
import { CloudIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';

const styles = {
  footer: "py-6 md:py-8 lg:py-10 text-center text-gray-500 text-sm md:text-base lg:text-lg bg-white",
  container: "flex items-center justify-center space-x-1",
  icon: "w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-black",
};

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <span>{t('footer.poweredBy')}</span>
        <CloudIcon className="h-4 md:h-5 lg:h-6 w-auto" />
      </div>
    </footer>
  );
};

export default Footer;
