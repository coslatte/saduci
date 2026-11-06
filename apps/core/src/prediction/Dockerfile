ARG PYTHON_IMAGE=public.ecr.aws/docker/library/python:3.13-slim
FROM ${PYTHON_IMAGE}

WORKDIR /app

ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# shared_core llega por el contexto de build nombrado `core` (apps/core), que
# compose declara en additional_contexts. Se instala primero: si solo cambia el
# codigo del servicio, esta capa se reutiliza y el build no vuelve a la red.
COPY --from=core src/shared_core ./shared_core
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install ./shared_core

COPY pyproject.toml ./
COPY app/ ./app/
COPY models/ ./models/
COPY alembic.ini ./
COPY migrations/ ./migrations/
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install \
      --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu \
      --only-binary=llama-cpp-python \
      "llama-cpp-python==0.3.36"
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install .

EXPOSE 7003

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 7003"]
