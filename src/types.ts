export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  remark: string;
  receiptUri?: string;
  contactName?: string;
  date: string;
}

export interface Passbook {
  id: string;
  name: string;
  transactions: Transaction[];
}

export interface Business {
  id: string;
  name: string;
  passbooks: Passbook[];
}

export type RootStackParamList = {
  Auth: undefined;
  Business: undefined;
  Passbook: { businessId: string; businessName: string };
  Transaction: { businessId: string; passbookId: string; passbookName: string };
};
