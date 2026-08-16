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

type LogoFrame = {
  aspectRatio: string;
  orientation: "landscape" | "portrait";
  source: string;
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
  const [frame, setFrame] = useState<LogoFrame | null>(null);
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
  const captureLoadedImage = useCallback((image: HTMLImageElement | null) => {
    if (!image?.complete || image.naturalWidth === 0 || image.naturalHeight === 0 || !activeSrc) return;

    const nextFrame: LogoFrame = {
      aspectRatio: `${image.naturalWidth} / ${image.naturalHeight}`,
      orientation: image.naturalWidth >= image.naturalHeight ? "landscape" : "portrait",
      source: activeSrc,
    };

    setFrame((current) => (
      current?.source === nextFrame.source
      && current.aspectRatio === nextFrame.aspectRatio
      && current.orientation === nextFrame.orientation
        ? current
        : nextFrame
    ));
    setLoadedSrc(activeSrc);
  }, [activeSrc]);

  if (!src || !activeSrc) {
    return (
      <span className="logo-image-stack logo-frame-landscape">
        <span className={fallbackClassName}>{fallback}</span>
      </span>
    );
  }

  const activeFrame = frame?.source === activeSrc ? frame : null;
  const frameStyle = activeFrame
    ? ({ "--logo-aspect": activeFrame.aspectRatio } as CSSProperties)
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
      className={`logo-image-stack logo-frame-${activeFrame?.orientation ?? "landscape"}`}
      style={frameStyle}
    >
      <span className={loadingFallbackClassName} aria-hidden="true">{fallback}</span>
      {/* Remote party logos are user-supplied spreadsheet data, so Next image allowlists are impractical here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={captureLoadedImage}
        className={imageClassName}
        src={activeSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={thumbnail ? "low" : undefined}
        onLoad={(event) => captureLoadedImage(event.currentTarget)}
        onError={() => {
          setLoadedSrc(null);
          setFrame((current) => current?.source === activeSrc ? null : current);
          setSourceIndex((current) => current + 1);
        }}
      />
    </span>
  );
}
