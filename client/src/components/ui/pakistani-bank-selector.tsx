'use client';

import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PakistaniBank {
  id: string;
  name: string;
  fullName: string;
  color?: string;
  bgLight?: string;
  badge?: React.ReactNode;
}

export const PAKISTANI_BANKS: PakistaniBank[] = [
  {
    id: 'meezan',
    name: 'Meezan Bank',
    fullName: 'Meezan Bank Limited (The Premier Islamic Bank)',
    color: '#651C32',
    bgLight: '#fdf2f4',
  },
  {
    id: 'hbl',
    name: 'Habib Bank Limited (HBL)',
    fullName: 'HBL - Habib Bank Limited',
    color: '#008269',
    bgLight: '#ecfdf5',
  },
  {
    id: 'ubl',
    name: 'United Bank Limited (UBL)',
    fullName: 'UBL - Where You Come First',
    color: '#00205B',
    bgLight: '#eff6ff',
  },
  {
    id: 'mcb',
    name: 'MCB Bank',
    fullName: 'MCB Bank Limited',
    color: '#F37021',
    bgLight: '#fff7ed',
  },
  {
    id: 'bank-alfalah',
    name: 'Bank Alfalah',
    fullName: 'Bank Alfalah Limited',
    color: '#E30613',
    bgLight: '#fef2f2',
  },
  {
    id: 'abl',
    name: 'Allied Bank (ABL)',
    fullName: 'Allied Bank Limited',
    color: '#0C2340',
    bgLight: '#f1f5f9',
  },
  {
    id: 'faysal-bank',
    name: 'Faysal Bank',
    fullName: 'Faysal Bank (Islamic Banking)',
    color: '#800020',
    bgLight: '#fdf2f4',
  },
  {
    id: 'standard-chartered',
    name: 'Standard Chartered Pakistan',
    fullName: 'Standard Chartered Bank (Pakistan) Ltd',
    color: '#009900',
    bgLight: '#f0fdf4',
  },
  {
    id: 'askari-bank',
    name: 'Askari Bank',
    fullName: 'Askari Bank Limited',
    color: '#004B23',
    bgLight: '#f0fdf4',
  },
  {
    id: 'js-bank',
    name: 'JS Bank',
    fullName: 'JS Bank Limited',
    color: '#003399',
    bgLight: '#eff6ff',
  },
  {
    id: 'soneri-bank',
    name: 'Soneri Bank',
    fullName: 'Soneri Bank Limited (Roshan Har Qadam)',
    color: '#F37024',
    bgLight: '#fff7ed',
  },
  {
    id: 'nbp',
    name: 'National Bank of Pakistan (NBP)',
    fullName: 'National Bank of Pakistan',
    color: '#006837',
    bgLight: '#f0fdf4',
  },
];

interface PakistaniBankSelectorProps {
  value: string;
  onChange: (bankName: string) => void;
  className?: string;
}

export const PakistaniBankSelector: React.FC<PakistaniBankSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const currentBank = PAKISTANI_BANKS.find(
    (b) => b.name.toLowerCase() === value.toLowerCase() || b.id.toLowerCase() === value.toLowerCase()
  ) || PAKISTANI_BANKS[0]; // defaults to Meezan Bank

  const filteredBanks = PAKISTANI_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 px-3.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all text-left cursor-pointer"
      >
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-gray-900 truncate">
            {currentBank.name}
          </span>
          <span className="text-[10px] text-gray-500 truncate mt-0.5">
            Pakistan Scheduled Bank & 1-Link Member
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Search Box */}
            <div className="p-2 border-b border-gray-100 bg-gray-50/80">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Pakistani bank (e.g. Meezan, HBL, UBL)..."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                autoFocus
              />
            </div>

            {/* Bank List - Text only, clean typography without icons */}
            <div className="overflow-y-auto divide-y divide-gray-50 p-1 flex-1">
              {filteredBanks.map((bank) => {
                const isSelected = bank.name.toLowerCase() === currentBank.name.toLowerCase();
                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => {
                      onChange(bank.name);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-2.5 px-3 rounded-xl text-left cursor-pointer transition-colors",
                      isSelected
                        ? "bg-teal-50/70 text-teal-950 font-semibold"
                        : "hover:bg-gray-50 text-gray-800"
                    )}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "text-xs truncate",
                        isSelected ? "font-bold text-teal-900" : "font-medium text-gray-900"
                      )}>
                        {bank.name}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate mt-0.5">
                        {bank.fullName}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-teal-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
              {filteredBanks.length === 0 && (
                <div className="py-6 text-center text-xs text-gray-400">
                  No Pakistani bank found matching "{search}"
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PakistaniBankSelector;
