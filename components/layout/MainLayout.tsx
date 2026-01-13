
import React, { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface MainLayoutProps {
  title: string;
  onBack?: () => void;
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ title, onBack, children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title={title} onBack={onBack} />
      <main className="flex-grow p-6">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
