import * as auth from './auth';
import * as messages from './messages';

export interface PickedAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

function toFilePart(asset: PickedAsset) {
  const name = asset.fileName ?? asset.uri.split('/').pop() ?? `upload-${Date.now()}.jpg`;
  const type = asset.mimeType ?? 'image/jpeg';
  // React Native's fetch/FormData expects this { uri, name, type } shape, not a Blob/File.
  return { uri: asset.uri, name, type } as unknown as Blob;
}

export async function uploadPostImages(assets: PickedAsset[]): Promise<string[]> {
  const form = new FormData();
  assets.forEach((asset) => form.append('images', toFilePart(asset)));
  const res = await auth.uploadImages(form);
  return res.urls;
}

export async function uploadAvatarImage(asset: PickedAsset): Promise<string> {
  const form = new FormData();
  form.append('avatar', toFilePart(asset));
  const res = await auth.uploadAvatar(form);
  return res.avatarUrl;
}

export async function uploadCoverImage(asset: PickedAsset): Promise<string> {
  const form = new FormData();
  form.append('cover', toFilePart(asset));
  const res = await auth.uploadCover(form);
  return res.coverUrl;
}

export async function uploadChatImageAsset(asset: PickedAsset): Promise<string> {
  const form = new FormData();
  form.append('image', toFilePart(asset));
  const res = await messages.uploadChatImage(form);
  return res.url;
}
