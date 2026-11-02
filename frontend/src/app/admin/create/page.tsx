"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/adminGuard";
import { usePageBuilder, PageBuilderProvider } from "@/context/pageBuilder";
import { Card } from "@/components/molecules";
import { Button } from "@/components/atoms";
import { Input } from "@/components/atoms";
import { Label } from "@/components/atoms";

function CreatePageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { createPage } = usePageBuilder();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [showInSidebar, setShowInSidebar] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isAdmin(user)) {
    router.replace("/");
    return null;
  }

  /** Create a URL-friendly slug: lowercase, strip diacritics, map a few chars. */
  function slugify(val: string) {
    return val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/æ/g, "ae")
      .replace(/œ/g, "oe")
      .replace(/ø/g, "o")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    setSlug(slugify(e.target.value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setError("El titulo y el slug son obligatorios.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await createPage({ title, slug, description, showInSidebar });
      router.push("/admin");
    } catch {
      setError("No se pudo crear la pagina. Intenta de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-6 text-center text-2xl font-semibold text-slate-800">
        Nueva página
      </h1>
      <Card padded={false}>
        <div className="px-5 pt-4 pb-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="w-full">
              <Label htmlFor="title">Titulo</Label>
              <Input
                id="title"
                fullWidth
                value={title}
                onChange={handleTitleChange}
                placeholder="Mi pagina"
              />
            </div>

            <div className="w-full">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                fullWidth
                value={slug}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setSlug(slugify(event.target.value))
                }
                placeholder="mi-pagina"
              />
              <p className="mt-1 text-xs text-slate-400">
                Accesible en /pages/{slug || "..."}
              </p>
            </div>

            <div className="w-full">
              <Label htmlFor="description">Descripcion (opcional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                placeholder="Descripción breve"
                rows={6}
                className="w-full min-h-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-(length:--font-size-sm) text-zinc-900 shadow-xs placeholder:text-zinc-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                Se recomienda hasta 255 caracteres para una visualización
                óptima.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sidebar"
                type="checkbox"
                checked={showInSidebar}
                onChange={(e) => setShowInSidebar(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              <Label htmlFor="sidebar">Mostrar en sidebar</Label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex w-full flex-col gap-2 pb-4 sm:flex-row sm:justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? "Creando..." : "Crear página"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/admin")}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

export default function CreatePage() {
  return (
    <PageBuilderProvider>
      <CreatePageContent />
    </PageBuilderProvider>
  );
}
