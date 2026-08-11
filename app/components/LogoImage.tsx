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
  const [useRepositoryFallback, setUseRepositoryFallback] = useState(false);
  const isRemoteOrEmbedded = src
    ? /^(?:[a-z]+:)?\/\//i.test(src) || /^(?:data|blob):/i.test(src)
    : false;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const resolvedSrc = !src
    ? ""
    : isRemoteOrEmbedded
      ? src
      : `${basePath}${src.startsWith("/") ? src : `/${src}`}`;
  const repositoryFallback = src?.startsWith("/media/logos/")
    ? `https://raw.githubusercontent.com/PLATELru/ppdb/main/public${src}`
    : null;
  const activeSrc = useRepositoryFallback && repositoryFallback
    ? repositoryFallback
    : resolvedSrc;

  const captureImage = useCallback((image: HTMLImageElement | null) => {
    if (!image?.complete || image.naturalWidth !== 0) return;
    if (!useRepositoryFallback && repositoryFallback) setUseRepositoryFallback(true);
    else setFailedSrc(activeSrc);
  }, [activeSrc, repositoryFallback, useRepositoryFallback]);

  if (!src || failedSrc === activeSrc) {
    return <span className={fallbackClassName}>{fallback}</span>;
  }

  return (
    // Remote party logos are user-supplied spreadsheet data, so Next image allowlists are impractical here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={captureImage}
      className={className}
      src={activeSrc}
      alt={alt}
      loading={loading}
      onError={() => {
        if (!useRepositoryFallback && repositoryFallback) setUseRepositoryFallback(true);
        else setFailedSrc(activeSrc);
      }}
    />
  );
}
