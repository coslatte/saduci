"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiLoader, FiSearch } from "react-icons/fi";
import { Label } from "@/components/atoms/Label";
import { ventTypeData } from "../helpers";

type Option = { value: string; label: string };

interface SimulationDiagnosesSectionProps {
  diagIng1: number;
  setDiagIng1: (value: number) => void;
  diagIng2: number;
  setDiagIng2: (value: number) => void;
  diagIng3: number;
  setDiagIng3: (value: number) => void;
  diagIng4: number;
  setDiagIng4: (value: number) => void;
  diagEgreso2: number;
  setDiagEgreso2: (value: number) => void;
  respInsuf: number;
  setRespInsuf: (value: number) => void;
  ventType: number;
  setVentType: (value: number) => void;
  diagnosisOptions: Option[];
  respiratoryOptions: Option[];
  catalogsLoading: boolean;
  catalogError: string | null;
  onRetryCatalogs: () => void;
}

export function CatalogDropdown({
  id,
  label,
  value,
  onChange,
  options,
  loading,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: Option[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => Number(option.value) === value);
  const filtered = options.filter((option) =>
    option.label
      .toLocaleLowerCase("es")
      .includes(query.trim().toLocaleLowerCase("es")),
  );

  function openDropdown() {
    setQuery("");
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
        document.getElementById(id)?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, id]);

  return (
    <div ref={dropdownRef} className="relative flex min-w-0 flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </Label>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-busy={loading}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-800 shadow-sm transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span className="whitespace-normal break-words leading-5">
          {loading ? "Cargando opciones…" : (selected?.label ?? "Seleccionar")}
        </span>
        {loading ? (
          <FiLoader
            aria-hidden
            className="size-4 shrink-0 animate-spin text-primary-700"
          />
        ) : (
          <FiChevronDown
            aria-hidden
            className="size-4 shrink-0 text-slate-500"
          />
        )}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-72 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="shrink-0 bg-white px-2 pt-2 pb-1">
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200">
              <FiSearch
                aria-hidden
                className="size-4 shrink-0 text-slate-400"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre…"
                aria-label={`Buscar ${label.toLocaleLowerCase("es")}`}
                className="min-w-0 flex-1 border-0 bg-white text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          <div
            id={`${id}-listbox`}
            role="listbox"
            className="min-h-0 overflow-y-auto bg-white px-2 pb-2"
          >
            {loading ? (
              <p
                role="status"
                className="flex items-center gap-2 px-3 py-4 text-sm text-slate-600"
              >
                <FiLoader
                  aria-hidden
                  className="size-4 animate-spin text-primary-700"
                />
                Recuperando opciones…
              </p>
            ) : filtered.length ? (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={Number(option.value) === value}
                  onClick={() => {
                    onChange(Number(option.value));
                    setOpen(false);
                  }}
                  className="block w-full whitespace-normal break-words rounded-lg px-3 py-2.5 text-left text-sm leading-5 text-slate-800 hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:outline-none"
                >
                  {option.label}
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-sm text-slate-500">
                No se encontraron opciones.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SimulationDiagnosesSection(
  props: SimulationDiagnosesSectionProps,
) {
  const diagnoses = props.diagnosisOptions;
  const ventOptions = ventTypeData();
  const diagnosisFields = [
    [
      "diag-ing-1",
      "Diagnóstico de ingreso 1",
      props.diagIng1,
      props.setDiagIng1,
    ],
    [
      "diag-ing-2",
      "Diagnóstico de ingreso 2",
      props.diagIng2,
      props.setDiagIng2,
    ],
    [
      "diag-ing-3",
      "Diagnóstico de ingreso 3",
      props.diagIng3,
      props.setDiagIng3,
    ],
    [
      "diag-ing-4",
      "Diagnóstico de ingreso 4",
      props.diagIng4,
      props.setDiagIng4,
    ],
    [
      "diag-egreso-2",
      "Diagnóstico de egreso",
      props.diagEgreso2,
      props.setDiagEgreso2,
    ],
  ] as const;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-5 border-b border-slate-200 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">
          Datos clínicos
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Diagnósticos y soporte respiratorio
        </h2>
        <p className="mt-1 text-sm leading-5 text-slate-600">
          Seleccione los diagnósticos registrados y el tipo de soporte aplicado.
        </p>
      </header>
      {props.catalogError && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <span>{props.catalogError}</span>
          <button
            type="button"
            onClick={props.onRetryCatalogs}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-medium text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            Reintentar carga
          </button>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {diagnosisFields.map(([id, label, value, onChange]) => (
          <CatalogDropdown
            key={id}
            id={id}
            label={label}
            value={value}
            onChange={onChange}
            options={diagnoses}
            loading={props.catalogsLoading}
          />
        ))}
        <CatalogDropdown
          id="resp-insuf"
          label="Tipo de insuficiencia respiratoria"
          value={props.respInsuf}
          onChange={props.setRespInsuf}
          options={props.respiratoryOptions}
          loading={props.catalogsLoading}
        />
        <CatalogDropdown
          id="vent-type"
          label="Ventilación artificial"
          value={props.ventType}
          onChange={props.setVentType}
          options={ventOptions}
          loading={false}
        />
      </div>
    </section>
  );
}
