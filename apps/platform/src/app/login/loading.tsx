import styles from "./loading.module.css";

export default function LoginLoading() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.spinner} aria-label="Cargando" />
        <p className={styles.text}>Cargando página de inicio de sesión…</p>
      </div>
    </div>
  );
}
