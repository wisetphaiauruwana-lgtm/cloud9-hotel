// src/services/api.customers.ts
import { ENDPOINTS } from './/api.constants';
import { parseJsonSafe, normalizeApiError } from './api.helpers';
import type { Customer } from '../types';

export const createCustomer = async (customerData: Customer): Promise<Customer> => {
  const res = await fetch(ENDPOINTS.CREATE_CUSTOMER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData),
  });
  const data = await parseJsonSafe(res) as any;
  if (!res.ok) {
    const msg = normalizeApiError(data, `Failed to create customer (${res.status})`);
    throw new Error(msg);
  }
  return (data?.data ?? data) as Customer;
};
