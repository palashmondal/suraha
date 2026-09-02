import { useEffect, useState } from 'react';
import { Alert, FormControlLabel, Switch, Typography } from '@mui/material';
import { bnStrings as S } from '../../i18n';
import AppDialog from '../../components/AppDialog';
import { FormField, SelectField, type Option } from '../../components/form/FormFields';
import { api, ApiError } from '../../api/client';
import { updateOfficer, type Officer } from '../../api/officers';

// Edit an existing account. Username and role are shown but never editable: the username is the
// login and the identifier every other screen refers to, and the role decides what the account
// may do — changing either would quietly turn one person's account into someone else's.
// A wrong role is fixed by deactivating and creating, which leaves the original record intact.
export default function EditOfficerDialog({
  officer, onClose, onSaved,
}: {
  officer: Officer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<Record<string, string>>({});
  const [active, setActive] = useState(true);
  const [unions, setUnions] = useState<Option[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const needsUnion = officer?.role === 'fwa' || officer?.role === 'up_sochib';
  const needsWard = officer?.role === 'fwa';

  useEffect(() => {
    if (!officer) return;
    setErr(null);
    setActive(officer.is_active);
    setF({
      name: officer.name ?? '',
      designation: officer.designation ?? '',
      phone: officer.phone ?? '',
      email: officer.email ?? '',
      union_id: officer.union_id ? String(officer.union_id) : '',
      ward_no: officer.ward_no ? String(officer.ward_no) : '',
      password: '',
    });
    api<{ unions: { id: number; name_bn: string }[] }>('/registry/unions')
      .then((r) => setUnions(r.unions.map((u) => ({ value: String(u.id), label: u.name_bn }))))
      .catch(() => setUnions([]));
  }, [officer]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officer) return;
    setErr(null);
    setBusy(true);
    try {
      await updateOfficer(officer.id, {
        name: f.name,
        designation: f.designation,
        phone: f.phone,
        email: f.email,
        is_active: active,
        // Blank means "leave the password alone" — the API treats it the same way.
        ...(f.password ? { password: f.password } : {}),
        ...(needsUnion && f.union_id ? { union_id: Number(f.union_id) } : {}),
        ...(needsWard && f.ward_no ? { ward_no: Number(f.ward_no) } : {}),
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog
      open={Boolean(officer)}
      title={S.officers.editTitle}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={S.officers.save}
      submitting={busy}
    >
      {err && <Alert severity="error">{err}</Alert>}

      {/* The unchangeable identity, shown so it is obvious which account is being edited. */}
      <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
        {S.officers.fUsername}: <b style={{ fontFamily: 'monospace' }}>{officer?.username ?? '—'}</b>
        {'  ·  '}
        {S.officers.fRole}: <b>{officer?.role_label_bn}</b>
      </Typography>

      <FormField label={S.officers.fName} value={f.name ?? ''} onChange={set('name')} />
      <FormField label={S.officers.fDesignation} value={f.designation ?? ''} onChange={set('designation')} />
      <FormField label={S.officers.fMobile} value={f.phone ?? ''} onChange={set('phone')} placeholder="01XXXXXXXXX" />
      <FormField label={S.officers.fEmail} value={f.email ?? ''} onChange={set('email')} type="email" />
      {needsUnion && (
        <SelectField label={S.officers.fUnion} value={f.union_id ?? ''} onChange={set('union_id')} options={unions} placeholder="নির্বাচন করুন" />
      )}
      {needsWard && (
        <FormField label={S.officers.fWard} value={f.ward_no ?? ''} onChange={set('ward_no')} type="number" />
      )}
      <FormField
        label={S.officers.fNewPassword}
        value={f.password ?? ''}
        onChange={set('password')}
        type="password"
      />
      <FormControlLabel
        control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
        label={active ? S.officers.active : S.officers.inactive}
      />
    </AppDialog>
  );
}
