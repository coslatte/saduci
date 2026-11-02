/**
 * Allowed values for the `cn` class name helper.
 *
 * Can be a string, falsy values, or nested arrays of the same.
 */
type ClassValue = string | undefined | null | false | ClassValue[];

/**
 * Concatenate class names while filtering out falsy values and flattening arrays.
 *
 * This is a small utility used across components to compose Tailwind (or other)
 * class strings in a safe, compact way.
 *
 * @param classes - A variadic list of class values (strings, arrays, falsy values)
 * @returns A single space-separated class string with falsy entries removed
 */
export function cn(...classes: ClassValue[]): string {
  return classes.flat(10).filter(Boolean).join(" ");
}

/**
 * Helper to expose a `data-disabled` attribute when a component or root should
 * be marked as disabled. Useful for styling and for tests that assert on
 * disabled state without changing the actual semantic `disabled` attribute.
 *
 * Example: <div {...dataDisabledProps(disabled)} />
 *
 * @param disabled - whether the root should be marked as disabled
 * @returns An object with `data-disabled` if disabled is truthy, otherwise an empty object
 */
export function dataDisabledProps(disabled?: boolean) {
  return disabled ? { "data-disabled": "true" } : {};
}
