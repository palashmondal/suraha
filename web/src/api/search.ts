import { api } from './client';

export interface SearchHit {
  label: string;          // মায়ের নাম, অভিযোগ, মানবিক সহায়তা …
  name: string | null;
  mobile: string | null;
  snippet: string | null;
  link: string;
  score: number;
}

export const searchAll = (q: string) =>
  api<{ results: SearchHit[] }>(`/search?q=${encodeURIComponent(q)}`);
