import sharp from "sharp";

export const thumbnailSettingsVersion = `192-webp-80-alpha90-v1-sharp-${sharp.versions.sharp}`;

export function createLogoThumbnail(bytes) {
  return sharp(bytes, { animated: false, density: 144, failOn: "none" })
    .rotate()
    .resize({ width: 192, height: 192, fit: "inside", withoutEnlargement: true })
    .webp({ alphaQuality: 90, effort: 4, quality: 80, smartSubsample: true })
    .toBuffer();
}
