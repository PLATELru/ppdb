"use client";

import { useState } from "react";

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
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <span className={fallbackClassName}>{fallback}</span>;

  const isRemoteOrEmbedded = /^(?:[a-z]+:)?\/\//i.test(src) || /^(?:data|blob):/i.test(src);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const resolvedSrc = isRemoteOrEmbedded
    ? src
    : `${basePath}${src.startsWith("/") ? src : `/${src}`}`;

  return (
    // Remote party logos are user-supplied spreadsheet data, so Next image allowlists are impractical here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
