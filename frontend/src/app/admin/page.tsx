"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/adminGuard";
import { usePageBuilder, PageBuilderProvider } from "@/context/pageBuilder";
import { Card } from "@/components/molecules";
import { Button } from "@/components/atoms";
import { Divider } from "@/components/atoms/Divider";
import { FiPlus, FiLayout, FiTrash2 } from "react-icons/fi";
import Link from "next/link";

function AdminPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { pages, loading, deletePage } = usePageBuilder();

  if (!isAdmin(user)) {
    router.replace("/");
    return null;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Administracion
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona las paginas y sus componentes
          </p>
        </div>
        <Link href="/admin/create">
          <Button variant="primary" size="sm" className="w-full sm:w-auto">
            <FiPlus className="mr-1.5" />
            Nueva página
          </Button>
        </Link>
      </div>

      <Divider className="mb-6 border-slate-200/80" />

      {loading && <p className="text-sm text-slate-500">Cargando paginas...</p>}

      {!loading && pages.length === 0 && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <FiLayout size={32} className="text-slate-300" />
            <p className="text-slate-500">
              No hay paginas creadas. Crea la primera.
            </p>
            <Link href="/admin/create">
              <Button variant="outline" size="sm">
                <FiPlus className="mr-1.5" />
                Crear pagina
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {pages.map((page) => (
          <Card
            key={page.id}
            header={
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="wrap-break-word font-semibold text-slate-800">
                  {page.title}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/pages/${page.slug}`} target="_blank">
                    <Button variant="ghost" size="xs">
                      Ver
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() => {
                      if (
                        confirm(
                          `Eliminar "${page.title}"? Esta accion no se puede deshacer.`,
                        )
                      ) {
                        void deletePage(page.id);
                      }
                    }}
                  >
                    <FiTrash2 />
                  </Button>
                </div>
              </div>
            }
          >
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <span>
                <strong className="text-slate-600">Slug:</strong> /{page.slug}
              </span>
              <span>
                <strong className="text-slate-600">Bloques:</strong>{" "}
                {page.blocks.length}
              </span>
              {page.showInSidebar && (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                  En sidebar
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <PageBuilderProvider>
      <AdminPageContent />
    </PageBuilderProvider>
  );
}
