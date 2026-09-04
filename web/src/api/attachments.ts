import { api } from './client';

// A citizen-supplied file on a submission. The complaint timeline's own report files share this
// shape, so one gallery renders both.
export interface Attachment {
  url: string;
  original_name: string | null;
  kind: 'pdf' | 'image';
}

/** Uploads the citizen's files right after the record itself was created. */
export const uploadAttachments = (
  resource: 'complaints' | 'assistances' | 'suggestions',
  id: number,
  files: File[],
) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('files[]', f));

  return api<{ attachments: Attachment[] }>(`/${resource}/${id}/attachments`, { method: 'POST', body: fd });
};
