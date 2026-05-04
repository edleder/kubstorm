'use client';

import { useState, useRef, useEffect } from 'react';
import { NamespaceInfo } from '@/lib/k8s/namespaces';
import { Check } from 'lucide-react';

interface NamespaceSelectorProps {
  namespaces: NamespaceInfo[];
  value: string | string[];
  onChange: (namespace: any) => void;
  multi?: boolean;
}

export function NamespaceSelector({ namespaces, value, onChange, multi = false }: NamespaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedList = Array.isArray(value) ? value : (value ? [value] : []);
  const isAllSelected = selectedList.length === 0;

  const displayValue = multi
    ? isAllSelected
      ? 'All Namespaces'
      : `${selectedList.length} namespace${selectedList.length !== 1 ? 's' : ''}`
    : (value || 'All Namespaces');

  const handleToggleNamespace = (namespaceName: string) => {
    if (!multi) {
      onChange(namespaceName);
      setIsOpen(false);
      return;
    }

    const newSelected = selectedList.includes(namespaceName)
      ? selectedList.filter((ns) => ns !== namespaceName)
      : [...selectedList, namespaceName];

    onChange(newSelected.length === 0 ? [] : newSelected);
  };

  const handleSelectAll = () => {
    if (!multi) {
      onChange('');
      setIsOpen(false);
      return;
    }

    if (isAllSelected) return;
    onChange([]);
  };

  return (
    <div className="flex gap-2">
      <label className="text-sm font-medium text-text-secondary self-center">
        Namespace{multi ? 's' : ''}:
      </label>
      <div ref={containerRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-2 bg-surface border border-border rounded text-text-primary focus:outline-none focus:border-accent hover:border-accent/50 transition-colors flex items-center justify-between min-w-48"
        >
          <span className="truncate">{displayValue}</span>
          <span className="ml-2 text-xs">▼</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded shadow-lg z-50 w-full">
            <div className="max-h-64 overflow-y-auto">
              <button
                onClick={handleSelectAll}
                className={`w-full text-left px-3 py-2 hover:bg-surface-elevated transition-colors flex items-center gap-2 ${
                  isAllSelected ? 'bg-accent/20 text-accent font-medium' : 'text-text-primary'
                }`}
              >
                {multi && <div className="w-4 h-4 border border-border rounded flex items-center justify-center">
                  {isAllSelected && <Check className="w-3 h-3 text-accent" />}
                </div>}
                All Namespaces
              </button>
              {namespaces.map((ns) => (
                <button
                  key={ns.name}
                  onClick={() => handleToggleNamespace(ns.name)}
                  className={`w-full text-left px-3 py-2 hover:bg-surface-elevated transition-colors text-sm flex items-center gap-2 ${
                    selectedList.includes(ns.name)
                      ? 'bg-accent/20 text-accent font-medium'
                      : 'text-text-primary'
                  }`}
                >
                  {multi && <div className="w-4 h-4 border border-border rounded flex items-center justify-center">
                    {selectedList.includes(ns.name) && (
                      <Check className="w-3 h-3 text-accent" />
                    )}
                  </div>}
                  {ns.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
