import { useState, useEffect } from 'react';
import axiosClient from 'src/lib/axios';

interface Account {
  id: number;
  account_number: number;
  broker_name: string;
  platform_name: string;
}

interface Props {
  value: number | undefined;
  onChange: (accountId: number | undefined) => void;
}

const AccountSelector = ({ value, onChange }: Props) => {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res: any = await axiosClient.get('/trader/account/paginated', {
          params: { PerPage: 200, Page: 1 },
        });
        if (res?.data?.data) {
          setAccounts(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch accounts', err);
      }
    };
    fetchAccounts();
  }, []);

  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
    >
      <option value="">Alle Accounts</option>
      {accounts.map(acc => (
        <option key={acc.id} value={acc.id}>
          {acc.account_number} ({acc.broker_name})
        </option>
      ))}
    </select>
  );
};

export default AccountSelector;
