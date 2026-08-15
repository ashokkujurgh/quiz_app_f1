import * as auth from './auth';
import * as messages from './messages';

export interface PickedAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

// Expo SDK 57's global `fetch` (expo/src/winter/fetch) replaces React Native's classic
// fetch/FormData. Its FormData serializer (convertFormData.ts) only accepts a `string` or a
// real `Blob` part — the classic RN `{ uri, name, type }` shape is silently accepted by
// `.append()` but then throws "Unsupported FormDataPart implementation" when the request is
// actually serialized. So each local image URI must be turned into a real Blob first (via a
// local fetch), then appended with the 3-arg form so Expo's patched FormData attaches the
// filename correctly.
async function toBlob(asset: PickedAsset): Promise<Blob> {
  const res = await fetch(asset.uri);
  const raw = await res.blob();
  const type = asset.mimeType || raw.type || 'image/jpeg';
  return raw.type === type ? raw : raw.slice(0, raw.size, type);
}

function filenameFor(asset: PickedAsset): string {
  return asset.fileName ?? asset.uri.split('/').pop() ?? `upload-${Date.now()}.jpg`;
}

export async function uploadPostImages(assets: PickedAsset[]): Promise<string[]> {
  const form = new FormData();
  for (const asset of assets) {
    form.append('images', await toBlob(asset), filenameFor(asset));
  }
  const res = await auth.uploadImages(form);
  return res.urls;
}

export async function uploadAvatarImage(asset: PickedAsset): Promise<string> {
  const form = new FormData();
  form.append('avatar', await toBlob(asset), filenameFor(asset));
  const res = await auth.uploadAvatar(form);
  return res.avatarUrl;
}

export async function uploadCoverImage(asset: PickedAsset): Promise<string> {
  const form = new FormData();
  form.append('cover', await toBlob(asset), filenameFor(asset));
  const res = await auth.uploadCover(form);
  return res.coverUrl;
}

export async function uploadChatImageAsset(asset: PickedAsset): Promise<string> {
  const form = new FormData();
  form.append('image', await toBlob(asset), filenameFor(asset));
  const res = await messages.uploadChatImage(form);
  return res.url;
}

export async function uploadGroupIconAsset(groupId: string, asset: PickedAsset): Promise<string | null> {
  const form = new FormData();
  form.append('icon', await toBlob(asset), filenameFor(asset));
  const res = await messages.updateGroupIcon(groupId, form);
  return res.data.icon ?? null;
}
