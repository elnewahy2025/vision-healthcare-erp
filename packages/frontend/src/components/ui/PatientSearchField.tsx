import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../../lib/api';
import { useDebounce } from '../../hooks';
import { Search, X, User, Loader2 } from 'lucide-react';

interface PatientSearchResult {
  id: string;
  name: string;
  mrn: string;
  phone: string;
}

interface PatientSearchFieldProps {
  value: string;
  onChange: (patientId: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export function PatientSearchField({
  value,
  onChange,
  placeholder = 'Search patient by name, MRN, or phone...',
  error,
  disabled = false,
  required = false,
}: PatientSearchFieldProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const data = await patientsApi.search(debouncedQuery);
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    setQuery('');
    setIsOpen(false);
    onChange(patient.id);
  }, [onChange]);

  const handleClear = useCallback(() => {
    setSelectedPatient(null);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onChange('');
  }, [onChange]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-gray-400" />
        <input
          type="text"
          className={`input pl-10 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          placeholder={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : placeholder}
          value={selectedPatient ? '' : query}
          onChange={e => { setQuery(e.target.value); setSelectedPatient(null); }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          disabled={disabled || !!selectedPatient}
          required={required}
          aria-label={t('appointment.patient')}
          aria-invalid={!!error}
          aria-describedby={error ? 'patient-search-error' : undefined}
        />
        {isLoading && (
          <Loader2 className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-gray-400 animate-spin" />
        )}
        {selectedPatient && !disabled && (
          <button type="button" onClick={handleClear}
            className="absolute top-1/2 -translate-y-1/2 right-3 p-1 rounded hover:bg-gray-100"
            aria-label="Clear selection">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        {!selectedPatient && !isLoading && query && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            className="absolute top-1/2 -translate-y-1/2 right-3 p-1 rounded hover:bg-gray-100"
            aria-label="Clear search">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          role="listbox">
          {results.map(patient => (
            <button
              key={patient.id}
              type="button"
              onClick={() => handleSelect(patient)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3"
              role="option"
              aria-selected={value === patient.id}>
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium">{patient.name}</p>
                <p className="text-xs text-gray-500">{patient.mrn} | {patient.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && !isLoading && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          {t('common.noData')}
        </div>
      )}

      {error && (
        <p id="patient-search-error" className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
