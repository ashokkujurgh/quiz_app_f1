import { apiFetch } from './apiFetch';

// Same rules as the upload endpoints (auth-service and message-service config/spaces.ts)
export const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

/** A message for a file the server would reject, or null if it's fine. */
export function imageProblem(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Please choose a JPG, PNG, GIF or WebP image.';
  if (file.size > IMAGE_MAX_BYTES) return 'That image is larger than 5 MB — please choose a smaller one.';
  return null;
}

/** POST one image as multipart `field`; returns the JSON body or throws with the server's message. */
export async function uploadImageFile(path: string, field: string, file: File): Promise<Record<string, unknown>> {
  const problem = imageProblem(file);
  if (problem) throw new Error(problem);
  const form = new FormData();
  form.append(field, file);
  const res = await apiFetch(path, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message ?? 'Upload failed — please try again.');
  return data;
}
