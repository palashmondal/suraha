import { useState } from 'react';
import { Alert, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { bnStrings as S } from '../i18n';
import { bnDate } from '../utils/bnNum';
import StatusTimeline from './StatusTimeline';
import ConfirmDialog from './ConfirmDialog';
import { ApiError } from '../api/client';
import type { CaseNote } from '../api/notes';

/**
 * An officer's running notes on one case — read as a dated timeline, appended to at any time.
 * Everyone who can open the record reads them; only the UNO / SEAL adds or deletes one.
 * Shared by the সাক্ষাৎকার detail page and the মানবিক সহায়তা কার্যক্রম section.
 */
export default function NotesPanel<T>({ title, placeholder, notes, canAdd, onAdd, onDelete, onChanged }: {
  title: string;
  placeholder: string;
  notes: CaseNote[];
  canAdd: boolean;
  onAdd: (body: string) => Promise<{ data: T }>;
  onDelete: (noteId: number) => Promise<{ data: T }>;
  onChanged: (record: T) => void;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doomed, setDoomed] = useState<number | null>(null); // note awaiting delete confirmation

  // A rejected save must say so. Without the catch the promise rejected into nothing: the button
  // appeared dead and the only trace was an unhandled rejection in the console. The text is kept
  // on failure so a retry does not mean retyping the note.
  const save = async () => {
    if (!body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await onAdd(body.trim());
      setBody('');
      onChanged(r.data);
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (doomed === null) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await onDelete(doomed);
      setDoomed(null);
      onChanged(r.data);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : S.auth.genericError);
      setDoomed(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ mt: 2, p: 2.5, borderRadius: '16px' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <StickyNote2OutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      </Stack>

      {notes.length === 0 ? (
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', fontStyle: 'italic' }}>
          {S.notes.empty}
        </Typography>
      ) : (
        <StatusTimeline
          nodes={notes.map((n) => ({
            key: String(n.id),
            label: n.body,
            timestamp: [bnDate(n.created_at), n.author].filter(Boolean).join(' • '),
            done: true,
            action: canAdd ? (
              <Tooltip title={S.notes.delete}>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={S.notes.delete}
                  onClick={() => setDoomed(n.id)}
                  sx={{
                    border: (t) => `1px solid ${t.palette.error.main}`,
                    p: 0.375,
                    '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' },
                  }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            ) : undefined,
          }))}
        />
      )}

      {canAdd && (
        <Stack spacing={1} sx={{ mt: notes.length ? 2.5 : 1.5 }}>
          {err && <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>}
          <TextField
            multiline
            minRows={2}
            size="small"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
          />
          <Button
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            disabled={busy || !body.trim()}
            onClick={() => void save()}
          >
            {S.notes.add}
          </Button>
        </Stack>
      )}

      <ConfirmDialog
        open={doomed !== null}
        title={S.notes.delete}
        message={S.notes.deleteConfirm}
        confirmLabel={S.notes.deleteYes}
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onClose={() => setDoomed(null)}
      />
    </Paper>
  );
}
