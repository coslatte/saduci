interface ImageBlockProps {
  src?: string;
  alt?: string;
  caption?: string;
}

/**
 * Displays an image block with optional caption and empty-state fallback.
 * Used in X case: rendering media sections configured from page builder.
 */
export function ImageBlock({
  src = "",
  alt = "Imagen",
  caption,
}: ImageBlockProps) {
  if (!src) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 text-sm">
        Sin imagen — agrega una URL
      </div>
    );
  }

  return (
    <figure className="w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg object-contain max-h-80"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-slate-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
