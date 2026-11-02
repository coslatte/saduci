export function formatErrorForUser(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message || String(err);
    if (msg.toLowerCase().includes("cancel")) {
      return "La simulación fue cancelada por el usuario.";
    }
    // Abort / timeout
    if (
      msg.toLowerCase().includes("exced") ||
      msg.toLowerCase().includes("timeout")
    ) {
      return "La solicitud de simulación ha excedido el tiempo de espera.";
    }
    // Network / fetch failures
    if (err.name === "TypeError") {
      return "No se pudo conectar con el servidor de simulación. Verifique su conexión e intente nuevamente.";
    }
    // HTTP status-based messages coming from runSimulation
    const m = msg.match(/Error al ejecutar la simulaci[oó]n:\s*(\d{3})/i);
    if (m) {
      const code = Number(m[1]);
      if (code >= 500)
        return "El servidor de simulación respondió con un error. Intente nuevamente más tarde.";
      if (code === 400)
        return "La solicitud de simulación es inválida. Revise los datos ingresados.";
      if (code === 422)
        return "Los datos enviados no cumplen los requisitos del servidor.";
      return `Error del servidor (código ${code}).`;
    }

    return msg;
  }
  return "No se pudo ejecutar la simulación.";
}
