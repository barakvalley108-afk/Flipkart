export type UploadResult = {
  url: string;
  publicId?: string;
  provider: "url" | "cloudinary";
};

export interface ImageUploader {
  upload(file: File): Promise<UploadResult>;
  remove?(publicId: string): Promise<void>;
}

export function validateImageUrl(value: string) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error("Only HTTP(S) image URLs are supported.");
  }
  return url.toString();
}

// First deployment uses image URLs. A Cloudinary adapter can implement
// ImageUploader later without changing product or banner forms.
