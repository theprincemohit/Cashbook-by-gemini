import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActiveBusiness {
  id: string;
  name: string;
}

interface BusinessContextType {
  activeBusiness: ActiveBusiness | null;
  setActiveBusiness: (business: ActiveBusiness | null) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const [activeBusiness, setBusinessState] = useState<ActiveBusiness | null>(null);

  const setActiveBusiness = useCallback((business: ActiveBusiness | null) => {
    setBusinessState(business);
    if (business) {
      AsyncStorage.setItem('last_selected_business_id', business.id).catch(console.error);
      AsyncStorage.setItem('last_selected_business_name', business.name).catch(console.error);
    } else {
      AsyncStorage.removeItem('last_selected_business_id').catch(console.error);
      AsyncStorage.removeItem('last_selected_business_name').catch(console.error);
    }
  }, []);

  return (
    <BusinessContext.Provider value={{ activeBusiness, setActiveBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
