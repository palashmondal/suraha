// A dated note an officer kept on a case — সাক্ষাৎকার notes and সহায়তা কার্যক্রম share the shape.
export interface CaseNote {
  id: number;
  body: string;
  author: string | null;
  created_at: string | null;
}
