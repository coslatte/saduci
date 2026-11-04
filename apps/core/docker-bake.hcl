# Construccion de imagenes con `docker buildx bake`.
#
# Por que existe: `docker compose build` (Compose v5.5.1 en Windows) falla con
#   failed to evaluate path "C:\...\proyecto/C:\...\proyecto\Dockerfile"
# duplicando la ruta del Dockerfile con la unidad del proyecto. `buildx bake`
# resuelve las rutas correctamente y produce las mismas imagenes que espera
# `docker compose up`.
#
# Uso (desde apps/core):
#   docker buildx bake            # construye las 5 imagenes
#   docker compose up -d          # levanta el stack usando las imagenes ya construidas
#
# Los tags siguen el esquema de Compose: <proyecto>-<servicio> (proyecto=saduci),
# de modo que `docker compose up -d` reutiliza estas imagenes sin reconstruir.

group "default" {
  targets = ["api-gateway", "user-service", "patient-service", "prediction-service", "simulation-service"]
}

target "api-gateway" {
  context    = "./src/api-gateway"
  dockerfile = "Dockerfile"
  contexts   = { core = "." }
  tags       = ["saduci-api-gateway:latest"]
}

target "user-service" {
  context    = "./src/user"
  dockerfile = "Dockerfile"
  contexts   = { core = "." }
  tags       = ["saduci-user-service:latest"]
}

target "patient-service" {
  context    = "./src/patient"
  dockerfile = "Dockerfile"
  contexts   = { core = "." }
  tags       = ["saduci-patient-service:latest"]
}

target "prediction-service" {
  context    = "./src/prediction"
  dockerfile = "Dockerfile"
  contexts   = { core = "." }
  tags       = ["saduci-prediction-service:latest"]
}

target "simulation-service" {
  context    = "./src/simulation"
  dockerfile = "Dockerfile"
  contexts   = { core = "." }
  tags       = ["saduci-simulation-service:latest"]
}
