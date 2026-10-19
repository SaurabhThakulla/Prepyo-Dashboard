import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAccount, InstitutionAccount } from './api';

// undefined = still checking, null = signed out.
type AccountState = InstitutionAccount | null | undefined;

interface AccountContextValue {
  account: AccountState;
  setAccount: (account: InstitutionAccount | null) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

/** Loads the signed-in institution admin once and shares it with every institution page. */
export function InstitutionAccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountState>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchAccount()
      .then(found => !cancelled && setAccount(found))
      .catch(() => !cancelled && setAccount(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ account, setAccount }), [account]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useInstitutionAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useInstitutionAccount must be used inside InstitutionAccountProvider');
  return value;
}
