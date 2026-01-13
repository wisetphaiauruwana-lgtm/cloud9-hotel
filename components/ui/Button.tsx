
import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  children: React.ReactNode;
  className?: string;
}

const styles = {
  base: 'w-full py-3 md:py-4 lg:py-5 px-4 rounded-xl font-semibold text-base md:text-lg lg:text-xl text-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-md hover:shadow-lg disabled:shadow-none transform hover:-translate-y-0.5 disabled:transform-none focus:ring-offset-white',
  variants: {
    primary: 'bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed focus:ring-gray-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-200 disabled:text-white focus:ring-red-500',
    outline: 'bg-transparent border-2 border-gray-900 text-gray-900 hover:bg-gray-50 focus:ring-gray-500 disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent'
  }
};

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className, ...props }) => {
  const buttonClasses = `${styles.base} ${styles.variants[variant]} ${className || ''}`;
  
  return (
    <button className={buttonClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;
