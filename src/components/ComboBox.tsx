"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

const MAX_RISULTATI = 50;

export function ComboBox({
  value,
  onChange,
  opzioni,
  placeholder,
  required,
  label,
}: {
  value: string;
  onChange: (valore: string) => void;
  opzioni: string[];
  placeholder?: string;
  required?: boolean;
  label: string;
}) {
  const [aperto, setAperto] = useState(false);
  const [evidenziato, setEvidenziato] = useState(0);
  const contenitoreRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const risultati = useMemo(() => {
    const query = value.trim().toLowerCase();
    const filtrati = query
      ? opzioni.filter((o) => o.toLowerCase().includes(query))
      : opzioni;
    return filtrati.slice(0, MAX_RISULTATI);
  }, [value, opzioni]);

  useEffect(() => {
    function chiudiSeFuori(e: MouseEvent) {
      if (contenitoreRef.current && !contenitoreRef.current.contains(e.target as Node)) {
        setAperto(false);
      }
    }
    document.addEventListener("mousedown", chiudiSeFuori);
    return () => document.removeEventListener("mousedown", chiudiSeFuori);
  }, []);

  function scegli(opzione: string) {
    onChange(opzione);
    setAperto(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setAperto(false);
      return;
    }
    if (!aperto || risultati.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setEvidenziato((i) => Math.min(i + 1, risultati.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setEvidenziato((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      scegli(risultati[evidenziato]);
    }
  }

  return (
    <div ref={contenitoreRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setEvidenziato(0);
            setAperto(true);
          }}
          onFocus={() => setAperto(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm text-gray-900 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setAperto((a) => !a)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-700"
          aria-label="Mostra elenco"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {aperto && risultati.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {risultati.map((opzione, i) => (
            <li key={opzione}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => scegli(opzione)}
                className={`block w-full truncate px-3 py-2 text-left text-sm ${
                  i === evidenziato ? "bg-brand-green-light text-brand-green-dark" : "text-gray-900"
                } hover:bg-brand-green-light hover:text-brand-green-dark`}
              >
                {opzione}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
