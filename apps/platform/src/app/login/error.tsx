"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/atoms/Buttons";
import { Text } from "@/components/atoms";
import styles from "./error.module.css";

interface LoginErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LoginError({ error, reset }: LoginErrorProps) {
  useEffect(() => {
    console.error("[LoginError]", error);
  }, [error]);

  const isConnectionError =
    error.message.includes("fetch") ||
    error.message.includes("network") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("timeout") ||
    error.message.includes("500") ||
    error.message.includes("502") ||
    error.message.includes("503") ||
    error.message.includes("504");

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        <div className={styles.content}>
          <Text as="h1" size="xl" weight="semibold" className={styles.title}>
            {isConnectionError
              ? "No hay conexión con el servidor"
              : "Ocurrió un error inesperado"}
          </Text>

          <Text size="sm" muted className={styles.description}>
            {isConnectionError
              ? "No pudimos conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo."
              : "Algo salió mal al cargar la página de inicio de sesión. Puedes intentar de nuevo o volver al inicio."}
          </Text>

          {error.digest && (
            <Text size="xs" muted className={styles.digest}>
              Referencia: {error.digest}
            </Text>
          )}
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={reset}
            className={styles.primaryButton}
          >
            Reintentar
          </Button>
          <Link href="/">
            <Button variant="outline" className={styles.outlineButton}>
              Volver al inicio
            </Button>
          </Link>
        </div>

        <div className={styles.help}>
          <Text size="xs" muted>
            ¿El problema persiste?{" "}
            <a
              href={`mailto:soporte@saduci.com?subject=${encodeURIComponent("Error en página de login")}&body=${encodeURIComponent(`Error: ${error.message}\nDigest: ${error.digest || "N/A"}`)}`}
              className="font-medium text-primary-600 hover:underline"
            >
              Contactar soporte
            </a>
          </Text>
        </div>
      </div>
    </div>
  );
}
