import { cn, dataDisabledProps } from "@/lib/utils";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { FiChevronUp, FiChevronDown, FiInfo } from "react-icons/fi";
import { HelpTooltipButton } from "@/components/atoms/HelpTooltipButton";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  fullWidth?: boolean;
  help?: string;
  info?: string;
  showNumberControls?: boolean;
}

/**
 * Renders a styled input with optional numeric steppers and helper tooltips.
 * Used in X case: reusable text and number entry across data forms.
 */
export function Input({
  error,
  fullWidth = true,
  className,
  disabled,
  help,
  info,
  showNumberControls = true,
  type,
  ...props
}: InputProps) {
  const inputId = useId();
  const infoId = info ? `${inputId}-info` : undefined;
  const ref = useRef<HTMLInputElement | null>(null);

  const inputType = type ?? "text";
  const hasNumberControls =
    inputType === "number" && showNumberControls && !disabled;
  const hasHelp = Boolean(help);
  const [isOutOfRange, setIsOutOfRange] = useState(false);

  // Support both React's onChange and native input events that tests may dispatch.
  const { onChange, id, ...restProps } = props;
  const lastForwardedValueRef = useRef<string | null>(null);

  function forwardChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!onChange) return;

    let currentValue = event.currentTarget.value;
    if (
      inputType === "number" &&
      /^-?0\d+$/.test(currentValue) &&
      !currentValue.includes(".")
    ) {
      currentValue = String(Number(currentValue));
      event.currentTarget.value = currentValue;
    }

    if (lastForwardedValueRef.current === currentValue) return;

    lastForwardedValueRef.current = currentValue;
    queueMicrotask(() => {
      lastForwardedValueRef.current = null;
    });

    onChange(event);
  }

  const updateOutOfRangeState = useCallback(
    (inputElement: HTMLInputElement) => {
      if (inputType !== "number") {
        setIsOutOfRange(false);
        return;
      }

      setIsOutOfRange(
        inputElement.validity.rangeOverflow ||
          inputElement.validity.rangeUnderflow,
      );
    },
    [inputType],
  );

  useEffect(() => {
    if (!ref.current) return;
    updateOutOfRangeState(ref.current);
  }, [props.max, props.min, props.value, updateOutOfRangeState]);

  return (
    <div className={cn("relative flex items-center", fullWidth && "w-full")}>
      <input
        {...dataDisabledProps(disabled)}
        ref={ref}
        id={id}
        aria-describedby={infoId}
        type={type}
        className={cn(
          "h-9 rounded-lg border bg-white px-3 text-(length:--font-size-sm) text-zinc-900 shadow-xs placeholder:text-zinc-400 transition-colors duration-300 input-transition focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 disabled:cursor-not-allowed disabled:opacity-50",
          hasNumberControls && hasHelp
            ? "pr-20"
            : hasNumberControls || info || hasHelp
              ? "pr-12"
              : "pr-3",
          error || isOutOfRange
            ? "border-red-400 focus:ring-red-500 focus:border-red-500"
            : "border-zinc-300",
          fullWidth && "w-full",
          className,
        )}
        disabled={disabled}
        onChange={(event) => {
          updateOutOfRangeState(event.currentTarget);
          forwardChange(event);
        }}
        onInput={(event) => {
          const changeEvent =
            event as unknown as React.ChangeEvent<HTMLInputElement>;
          updateOutOfRangeState(changeEvent.currentTarget);
          forwardChange(changeEvent);
        }}
        {...restProps}
      />

      {hasNumberControls && (
        <div
          className={cn(
            "absolute flex flex-col h-[calc(100%-0.75rem)] justify-center",
            hasHelp ? "right-9" : "right-2",
          )}
          aria-hidden
        >
          <button
            type="button"
            aria-label="Incrementar valor"
            className="flex items-center justify-center w-8 text-gray-400 rounded-t-lg h-1/2 hover:text-primary-600 hover:bg-primary-50 input-transition"
            onClick={() => ref.current?.stepUp()}
          >
            <FiChevronUp className="w-4 h-4" aria-hidden />
          </button>
          <div className="w-6 h-px mx-auto bg-gray-100" />
          <button
            type="button"
            aria-label="Disminuir valor"
            className="flex items-center justify-center w-8 text-gray-400 rounded-b-lg h-1/2 hover:text-primary-600 hover:bg-primary-50 input-transition"
            onClick={() => ref.current?.stepDown()}
          >
            <FiChevronDown className="w-4 h-4" aria-hidden />
          </button>
        </div>
      )}

      {info && (
        <div
          className="absolute flex items-center right-2"
          style={{ right: hasNumberControls ? 38 : 8 }}
        >
          <div className="relative flex items-center group">
            <button
              type="button"
              aria-label="Más información"
              aria-describedby={infoId}
              className="flex items-center justify-center text-gray-400 rounded-full w-7 h-7 hover:text-primary-600 hover:bg-primary-50 input-transition"
            >
              <FiInfo className="w-4 h-4" aria-hidden />
            </button>

            {infoId && (
              <div
                id={infoId}
                role="tooltip"
                className="absolute bottom-full right-1/2 mb-2 translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-1 text-(length:--font-size-xs) text-white opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 group-focus:opacity-100"
              >
                {info}
                <div className="absolute -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-gray-800" />
              </div>
            )}
          </div>
        </div>
      )}

      {help && (
        <HelpTooltipButton
          help={help}
          className="absolute -translate-y-1/2 right-2 top-1/2"
          buttonClassName="flex items-center justify-center cursor-help"
        />
      )}
    </div>
  );
}
