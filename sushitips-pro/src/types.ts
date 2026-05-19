export type Role = 'waiter' | 'cook' | 'dishwasher';

export interface Employee {
  id: string;
  name: string;
  role: Role;
  isActive: boolean;
}

export type Shift = 'lunch' | 'dinner';

export interface Tips {
  cash: number;
  card: number;
  delivery: number;
  gratuity: number;
}

export interface TipLog {
  id: string;
  date: string; // YYYY-MM-DD
  shift: Shift;
  cash: number;
  card: number;
  delivery: number;
  gratuity: number;
  activeEmployeeIds: string[];
  periodId: string;
}

export interface PayPeriod {
  id: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}

export interface Settings {
  kitchenPercent: number;
  waitstaffPercent: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
