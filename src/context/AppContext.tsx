import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Business, Passbook, Transaction } from '../types';

interface AppContextType {
  user: { email: string; name: string } | null;
  businesses: Business[];
  login: (email: string, name: string) => void;
  logout: () => void;
  addBusiness: (name: string) => void;
  addPassbook: (businessId: string, name: string) => void;
  addTransaction: (businessId: string, passbookId: string, transaction: Omit<Transaction, 'id' | 'date'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppContextType['user']>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  const login = (email: string, name: string) => setUser({ email, name });
  const logout = () => { setUser(null); setBusinesses([]); };

  const addBusiness = (name: string) => {
    const newBiz: Business = { id: Date.now().toString(), name, passbooks: [] };
    setBusinesses([...businesses, newBiz]);
  };

  const addPassbook = (businessId: string, name: string) => {
    setBusinesses(businesses.map(biz => {
      if (biz.id !== businessId) return biz;
      const newPass: Passbook = { id: Date.now().toString(), name, transactions: [] };
      return { ...biz, passbooks: [...biz.passbooks, newPass] };
    }));
  };

  const addTransaction = (businessId: string, passbookId: string, tx: Omit<Transaction, 'id' | 'date'>) => {
    setBusinesses(businesses.map(biz => {
      if (biz.id !== businessId) return biz;
      return {
        ...biz,
        passbooks: biz.passbooks.map(pass => {
          if (pass.id !== passbookId) return pass;
          const newTx: Transaction = {
            ...tx,
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })
          };
          return { ...pass, transactions: [newTx, ...pass.transactions] };
        })
      };
    }));
  };

  return (
    <AppContext.Provider value={{ user, businesses, login, logout, addBusiness, addPassbook, addTransaction }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
