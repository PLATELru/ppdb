"use client";

import { useCallback, useState, type CSSProperties } from "react";

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
  const [frame, setFrame] = useState<{
    aspectRatio: string;
    orientation: "landscape" | "portrait";
  } | null>(null);
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
    if (!image?.complete) return;
    if (image.naturalWidth === 0) {
      if (!useRepositoryFallback && repositoryFallback) setUseRepositoryFallback(true);
      else setFailedSrc(activeSrc);
      return;
    }

    setFrame({
      aspectRatio: `${image.naturalWidth} / ${image.naturalHeight}`,
      orientation: image.naturalWidth >= image.naturalHeight ? "landscape" : "portrait",
    });
  }, [activeSrc, repositoryFallback, useRepositoryFallback]);

  if (!src || failedSrc === activeSrc) {
    return (
      <span className="logo-image-stack logo-frame-landscape">
        <span className={fallbackClassName}>{fallback}</span>
      </span>
    );
  }

  const frameStyle = frame
    ? ({ "--logo-aspect": frame.aspectRatio } as CSSProperties)
    : undefined;

  return (
    <span
      className={`logo-image-stack logo-frame-${frame?.orientation ?? "landscape"}`}
      style={frameStyle}
    >
      {/* Remote party logos are user-supplied spreadsheet data, so Next image allowlists are impractical here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={captureImage}
        className={className}
        src={activeSrc}
        alt={alt}
        loading={loading}
        onLoad={(event) => captureImage(event.currentTarget)}
        onError={() => {
          if (!useRepositoryFallback && repositoryFallback) setUseRepositoryFallback(true);
          else setFailedSrc(activeSrc);
        }}
      />
    </span>
  );
}
