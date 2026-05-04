'use client';

import { useState } from 'react';

interface TabOption {
  id: any;
  label: string;
}

interface TabSelectorProps {
  tabs: TabOption[];
  activeTab: any;
  onTabChange: (tabId: any) => void;
}

export function TabSelector({
  tabs,
  activeTab,
  onTabChange,
}: TabSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Select';

  return (
    <div className="relative inline-block w-full md:w-64">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-left flex justify-between items-center text-text-primary hover:border-accent transition-colors focus:outline-none focus:border-accent"
      >
        <span className="font-medium">{activeTabLabel}</span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated border border-border rounded-lg shadow-lg z-50">
          <div className="max-h-96 overflow-y-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 transition-colors border-b border-border last:border-b-0 ${
                  activeTab === tab.id
                    ? 'bg-accent/20 text-accent font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
