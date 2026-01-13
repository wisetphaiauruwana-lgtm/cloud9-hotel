import React, { createContext, useContext, useState, useEffect } from 'react';
import { Guest } from '../types';

interface ReservationContextProps {
  token: string | null;
  reservationDetails: { guestName: string } | null;
  setToken: (token: string) => void;
  fetchReservationDetails: () => Promise<void>;
}

const ReservationContext = createContext<ReservationContextProps | undefined>(undefined);

export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [reservationDetails, setReservationDetails] = useState<{ guestName: string } | null>(null);

  const fetchReservationDetails = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/reservation', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch reservation details');

      const data = await response.json();
      setReservationDetails(data); // Ensure `data` includes `bookingId`
    } catch (error) {
      console.error('Error fetching reservation details:', error);
    }
  };

  useEffect(() => {
    if (token) fetchReservationDetails();
  }, [token]);

  return (
    <ReservationContext.Provider value={{ token, reservationDetails, setToken, fetchReservationDetails }}>
      {children}
    </ReservationContext.Provider>
  );
};

export const useReservationContext = (): ReservationContextProps => {
  const context = useContext(ReservationContext);
  if (!context) throw new Error('useReservationContext must be used within a ReservationProvider');
  return context;
};
