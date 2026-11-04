"use client";

import { Text } from "@/components/atoms/Text";

interface RecordsPageHeaderProps {
  title: string;
  description?: string;
  roleHint: string;
}

export function RecordsPageHeader({
  title,
  description,
  roleHint,
}: RecordsPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <div>
        <Text as="h1" size="2xl" weight="semibold" className="text-zinc-900">
          {title}
        </Text>
        <Text as="p" size="sm" muted className="mt-1">
          {description}
        </Text>
      </div>
      <Text as="p" size="sm" className="text-slate-400">
        {roleHint}
      </Text>
    </div>
  );
}
