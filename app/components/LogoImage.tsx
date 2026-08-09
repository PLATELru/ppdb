"use client";

import { useCallback, useState } from "react";

type Props = {
  alt: string;
  className?: string;
  fallback: string;
  fallbackClassName?: string;
  loading?: "eager" | "lazy";
  src: string | null;
};

export function LogoImage({
  alt,
  className,
  fallback,
  fallbackClassName,
  loading = "lazy",
  src,
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isRemoteOrEmbedded = Boolean(src) && (
    /^(?:[a-z]+:)?\/\//i.test(src) || /^(?:data|blob):/i.test(src)
  );
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const resolvedSrc = !src
    ? ""
    : isRemoteOrEmbedded
      ? src
      : `${basePath}${src.startsWith("/") ? src : `/${src}`}`;

  const captureImage = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth === 0) setFailedSrc(resolvedSrc);
  }, [resolvedSrc]);

  if (!src || failedSrc === resolvedSrc) {
    return <span className={fallbackClassName}>{fallback}</span>;
  }

  return (
    // Remote party logos are user-supplied spreadsheet data, so Next image allowlists are impractical here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={captureImage}
      className={className}
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      onError={() => setFailedSrc(resolvedSrc)}
    />
  );
}
