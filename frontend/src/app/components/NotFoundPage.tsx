import Link from "next/link";
import { Text } from "@/components/atoms/Text";
import { Button } from "@/components/atoms/Buttons";

const styles = {
  wrapper:
    "flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center",
  codeText:
    "font-secondary select-none font-bold leading-none text-primary-600",
  codeSize: "text-[7rem] md:text-[10rem]",
  textBlock: "flex max-w-sm flex-col gap-2",
  divider: "mx-auto h-px w-12 bg-primary-200",
} as const;

/**
 * Shows a branded 404 fallback with a shortcut back to home.
 * Used in X case: unknown route handling in the Next.js not-found boundary.
 */
export default function NotFoundPage() {
  return (
    <div className={styles.wrapper}>
      <p
        className={`${styles.codeText} ${styles.codeSize}`}
        aria-label="Error 404"
      >
        "404"
      </p>
      <div className={styles.divider} role="presentation" />
      <div className={styles.textBlock}>
        <Text as="h1" size="2xl" weight="semibold" tracking="tight">
          "Página no encontrada"
        </Text>
        <Text size="sm" muted>
          "La ruta que intentas acceder no existe o no está disponible."
        </Text>
      </div>
      <Link href="/">
        <Button variant="primary">"Volver al inicio"</Button>
      </Link>
    </div>
  );
}
