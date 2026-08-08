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

  return (
    // Remote party logos are user-supplied spreadsheet data, so Next image allowlists are impractical here.
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={src} alt={alt} loading={loading} onError={() => setFailed(true)} />
  );
}
