import { useState, useRef, useEffect } from 'react';
import type { Account } from '../types';
import { calculateBalances } from '../utils/projections';
import type { Transaction } from '../types';

interface MobileHamburgerMenuProps {
  accounts: Account[];
  activeAccountId: string;
  transactions: Transaction[];
  onSelectAccount: (accountId: string) => void;
  onManageAccounts: () => void;
  onShowSummary: () => void;
}

export function MobileHamburgerMenu({
  accounts,
  activeAccountId,
  transactions,
  onSelectAccount,
  onManageAccounts,
  onShowSummary,
}: MobileHamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as unknown as EventListener);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as unknown as EventListener);
    };
  }, [isOpen]);

  const handleAccountSelect = (accountId: string) => {
    onSelectAccount(accountId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all"
        aria-label="Account menu"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 max-h-[80vh] overflow-y-auto">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Select Account
            </h3>
          </div>

          <div className="py-2">
            {/* Summary Option */}
            <button
              onClick={() => {
                onShowSummary();
                setIsOpen(false);
              }}
              className="w-full px-3 py-3 hover:bg-gray-700/50 transition-all flex items-center gap-2 border-b border-gray-700"
            >
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium text-white">Account Summary</span>
            </button>
            {/* Checking/Savings Accounts */}
            {accounts.filter(acc => acc.accountType !== 'credit_card').length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Checking & Savings
                  </p>
                </div>
                {accounts
                  .filter(acc => acc.accountType !== 'credit_card')
                  .map(acc => {
                    const accTransactions = transactions.filter(t => t.accountId === acc.id);
                    const accBalance = accTransactions.length > 0
                      ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                      : acc.availableBalance || 0;

                    const isActive = acc.id === activeAccountId;

                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleAccountSelect(acc.id)}
                        className={`w-full px-3 py-3 flex items-center justify-between transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-l-4 border-blue-500'
                            : 'hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            {isActive && (
                              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="text-sm font-medium text-white">{acc.name}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{acc.institution}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${accBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${accBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}

            {/* Credit Card Accounts */}
            {accounts.filter(acc => acc.accountType === 'credit_card').length > 0 && (
              <div>
                <div className="px-3 py-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Credit Cards
                  </p>
                </div>
                {accounts
                  .filter(acc => acc.accountType === 'credit_card')
                  .map(acc => {
                    const accTransactions = transactions.filter(t => t.accountId === acc.id);
                    const accBalance = accTransactions.length > 0
                      ? calculateBalances(accTransactions, acc.availableBalance || 0)[accTransactions.length - 1]?.balance
                      : acc.availableBalance || 0;

                    const isActive = acc.id === activeAccountId;

                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleAccountSelect(acc.id)}
                        className={`w-full px-3 py-3 flex items-center justify-between transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-l-4 border-blue-500'
                            : 'hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            {isActive && (
                              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="text-sm font-medium text-white">{acc.name}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{acc.institution}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${accBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {accBalance > 0 ? '-' : ''}${Math.abs(accBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {accBalance > 0 ? 'owed' : 'credit'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Manage Accounts Button */}
          <div className="p-3 border-t border-gray-700">
            <button
              onClick={() => {
                onManageAccounts();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage Accounts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
