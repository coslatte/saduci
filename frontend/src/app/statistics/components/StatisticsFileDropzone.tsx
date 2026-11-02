"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/atoms/Label";
import { cn } from "@/lib/utils";

interface StatisticsFileDropzoneProps {
  label: string;
  files: File[];
  inputId: string;
  multiple?: boolean;
  onChange: (files: File[]) => void;
}

/**
 * Provides clickable CSV file selection with selected-file preview.
 * Used in X case: uploading experiment files in statistics tests.
 */
export function StatisticsFileDropzone({
  label,
  files,
  inputId,
  multiple = false,
  onChange,
}: StatisticsFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  function hasCSVExtension(file: File): boolean {
    return file.name.toLowerCase().endsWith(".csv");
  }

  function handleFileSelection(selected: File[]): void {
    const csvFiles = selected.filter(hasCSVExtension);

    if (csvFiles.length !== selected.length) {
      setDropError("Solo se aceptan archivos con extensión .csv");
    } else {
      setDropError(null);
    }

    if (csvFiles.length === 0) {
      return;
    }

    onChange(multiple ? csvFiles : [csvFiles[0]]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        className={cn(
          "flex flex-col items-center justify-center gap-2",
          "cursor-pointer rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center transition-colors hover:border-primary-400",
          isDragging && "border-primary-500 bg-primary-100",
          files.length > 0 && "border-primary-300 bg-primary-50",
        )}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const droppedFiles = Array.from(event.dataTransfer.files ?? []);
          handleFileSelection(droppedFiles);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".csv"
          multiple={multiple}
          className="sr-only"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            const selected = event.target.files
              ? Array.from(event.target.files)
              : [];
            handleFileSelection(selected);
          }}
        />

        {files.length > 0 ? (
          <ul className="w-full text-left">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="text-(length:--font-size-sm) font-medium text-primary-700"
              >
                {multiple ? `Experimento ${index + 1}: ` : ""}
                {file.name}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-(length:--font-size-sm) text-zinc-400">
              {isDragging
                ? multiple
                  ? "Suelta los archivos CSV aquí"
                  : "Suelta el archivo CSV aquí"
                : multiple
                  ? "Haz clic para seleccionar archivos CSV (mínimo 3)"
                  : "Haz clic para seleccionar un archivo CSV"}
            </span>
            {!isDragging && (
              <span className="text-(length:--font-size-xs) text-zinc-400">
                {multiple ? "o arrastra CSV aquí" : "o arrastra un CSV aquí"}
              </span>
            )}
          </div>
        )}
      </div>

      {dropError && (
        <p className="text-(length:--font-size-xs) text-red-600">{dropError}</p>
      )}
    </div>
  );
}
