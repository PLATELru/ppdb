import sharp from "sharp";
import { isSvgLogo, svgThumbnailRevision } from "./logo-thumbnail-path.mjs";

export const thumbnailSettingsVersion = `192-webp-80-alpha90-v1-sharp-${sharp.versions.sharp}`;
export const svgThumbnailSettingsVersion = `${svgThumbnailRevision}-webp-sharp-${sharp.versions.sharp}`;

export async function createLogoThumbnail(bytes, filename) {
  const image = sharp(bytes, { animated: false, density: 144, failOn: "none" }).rotate();
  if (isSvgLogo(filename) && (await image.metadata()).format === "svg") {
    return image.resize({ width: 288, height: 288, fit: "inside" })
      .webp({ lossless: true, effort: 4 })
      .toBuffer();
  }
  return image
    .resize({ width: 192, height: 192, fit: "inside", withoutEnlargement: true })
    .webp({ alphaQuality: 90, effort: 4, quality: 80, smartSubsample: true })
    .toBuffer();
}
