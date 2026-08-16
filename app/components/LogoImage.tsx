"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";

type Props = {
  alt: string;
  className?: string;
  fallback: string;
  fallbackClassName?: string;
  loading?: "eager" | "lazy";
  src: string | null;
  thumbnail?: boolean;
};

function indexThumbnailPath(src: string) {
  const path = src.split(/[?#]/, 1)[0];
  if (!/^\/media\/logos\/.+\.png$/i.test(path)) return null;
  return `/media/logo-thumbnails/${path.slice("/media/logos/".length)}.webp`;
}

function withBasePath(src: string, basePath: string) {
  const isRemoteOrEmbedded = /^(?:[a-z]+:)?\/\//i.test(src) || /^(?:data|blob):/i.test(src);
  if (isRemoteOrEmbedded) return src;
  return `${basePath}${src.startsWith("/") ? src : `/${src}`}`;
}

export function LogoImage({
  alt,
  className,
  fallback,
  fallbackClassName,
  loading = "lazy",
  src,
  thumbnail = false,
}: Props) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [frame, setFrame] = useState<{
    aspectRatio: string;
    orientation: "landscape" | "portrait";
  } | null>(null);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const sources = useMemo(() => {
    if (!src) return [];
    const thumbnailSrc = thumbnail ? indexThumbnailPath(src) : null;
    const originalSrc = withBasePath(src, basePath);
    const repositoryFallback = src.startsWith("/media/logos/")
      ? `https://raw.githubusercontent.com/PLATELru/ppdb/main/public${src}`
      : null;

    return Array.from(
      new Set(
        [
          thumbnailSrc ? withBasePath(thumbnailSrc, basePath) : null,
          originalSrc,
          repositoryFallback,
        ].filter((item): item is string => Boolean(item)),
      ),
    );
  }, [basePath, src, thumbnail]);

  const activeSrc = sources[sourceIndex] ?? null;
  const captureImage = useCallback((image: HTMLImageElement | null) => {
    if (!image?.complete || image.naturalWidth === 0 || !activeSrc) return;

    const isLandscape = image.naturalWidth >= image.naturalHeight;

    setFrame({
      aspectRatio: `${image.naturalWidth} / ${image.naturalHeight}`,
      orientation: isLandscape ? "landscape" : "portrait",
    });
    setLoadedSrc(activeSrc);
  }, [activeSrc]);

  if (!src || !activeSrc) {
    return (
      <span className="logo-image-stack logo-frame-landscape">
        <span className={fallbackClassName}>{fallback}</span>
      </span>
    );
  }

  const frameStyle = frame
    ? ({
        "--logo-aspect": frame.aspectRatio,
      } as CSSProperties)
    : undefined;
  const loaded = loadedSrc === activeSrc;
  const imageClassName = [className, loaded ? "logo-source-loaded" : "logo-source-loading"]
    .filter(Boolean)
    .join(" ");
  const loadingFallbackClassName = [fallbackClassName, "logo-loading-fallback"]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={`logo-image-stack logo-frame-${frame?.orientation ?? "landscape"}`}
      style={frameStyle}
    >
      <span className={loadingFallbackClassName} aria-hidden="true">{fallback}</span>
      {/* Remote party logos are user-supplied spreadsheet data, so Next image allowlists are impractical here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={captureImage}
        className={imageClassName}
        src={activeSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={thumbnail ? "low" : undefined}
        onLoad={(event) => captureImage(event.currentTarget)}
        onError={() => {
          setLoadedSrc(null);
          setFrame(null);
          setSourceIndex((current) => current + 1);
        }}
      />
    </span>
  );
}
