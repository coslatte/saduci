"use client";

import { useActionState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodType } from "zod";
import { FormActionResult } from "@/shared/types";

export interface UseFormWithActionOptions<TData> {
  schema: ZodType<TData>;
  action: (
    prev: FormActionResult<TData>,
    formData: FormData,
  ) => Promise<FormActionResult<TData>>;
  onSuccess?: (data: TData) => void | Promise<void>;
  defaultValues?: TData;
}

export interface UseFormWithActionReturn<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  state: FormActionResult;
  isPending: boolean;
  submit: (e?: React.FormEvent) => void;
  reset: (values?: Partial<TData>) => void;
}

export function useFormWithAction<TData>(
  options: UseFormWithActionOptions<TData>,
): UseFormWithActionReturn<TData> {
  const form = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(options.schema as any),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: options.defaultValues as any,
    mode: "onChange",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as UseFormReturn<any>;

  const [state, formAction, isPending] = useActionState(options.action, null);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    form.handleSubmit(async (validData) => {
      const fd = new FormData();
      (Object.entries(validData) as [string, unknown][]).forEach(
        ([key, value]) => {
          if (value !== undefined && value !== null) {
            fd.append(key, String(value));
          }
        },
      );
      await formAction(fd);
    })();
  };

  const reset = (values?: Partial<TData>) => {
    form.reset(values as TData);
  };

  // Sync server errors to RHF
  if (state?.errors) {
    for (const [field, messages] of Object.entries(state.errors)) {
      const errorMessage = Array.isArray(messages) ? messages[0] : messages;
      form.setError(field, {
        type: "server",
        message: String(errorMessage),
      });
    }
  }

  // Handle success - call onSuccess when state transitions to success
  if (state?.success && options.onSuccess && !form.formState.isSubmitting) {
    options.onSuccess(state.data as TData);
  }

  return {
    form,
    state,
    isPending,
    submit,
    reset,
  };
}
