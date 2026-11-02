"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { getPages } from "@/lib/pageConfigService";
import type { PageConfig } from "@/lib/pageConfigTypes";
import { DynamicPage } from "@/components/organisms/DynamicPage";
import { Spinner } from "@/components/atoms";
import { Container } from "@/components/layout";

export default function DynamicSlugPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [config, setConfig] = useState<PageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getPages()
      .then((pages) => {
        const found = pages.find((p) => p.slug === slug);
        if (!found) {
          setMissing(true);
        } else {
          setConfig(found);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (missing) {
    notFound();
  }

  if (loading) {
    return (
      <Container>
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </Container>
    );
  }

  if (!config) return null;

  return (
    <Container>
      <DynamicPage config={config} />
    </Container>
  );
}
