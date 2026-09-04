import { useEffect, useState } from 'react';
import { Alert, Box, FormControlLabel, Switch, Typography } from '@mui/material';
import { bnStrings as S } from '../../i18n';
import AppDialog from '../../components/AppDialog';
import { FormField, SelectField } from '../../components/form/FormFields';
import { ApiError } from '../../api/client';
import { useUnionOptions, type UnionOption } from '../../tenant/useUnionOptions';
import { listSwitchableUpazilas, listUnionsOf, type SwitchableUpazila } from '../../api/registry';
import { createOfficer, getFilledPosts, type AssignableRole, type FilledPosts } from '../../api/officers';
import { useAuth } from '../../auth/AuthContext';

// Shared account-creation form. Used by both the officer roster and the full user directory, so
// there is one place that knows the field set, the role list and how a tenant is chosen.
export default function CreateOfficerDialog({
  open, roles, needsTenant, selectedUpazilaId, lockedRole, title, onClose, onCreated,
}: {
  open: boolean;
  roles: AssignableRole[];
  needsTenant: boolean;
  selectedUpazilaId: string | null;
  /** Opened from a page that is about one role (the তদন্ত কর্মকর্তা roster): preselect it and
   *  leave it unchangeable, so the account cannot be created into the wrong list. */
  lockedRole?: string;
  title?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [f, setF] = useState<Record<string, string>>({});
  // SEAL picks the upazila here rather than being sent back to the top-bar switcher: the list is
  // the provisioned subdomains, narrowed by district first because there are hundreds of them.
  const [upazilas, setUpazilas] = useState<SwitchableUpazila[]>([]);
  const [districtId, setDistrictId] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [pickedUnions, setPickedUnions] = useState<UnionOption[]>([]);
  const contextUnions = useUnionOptions(!needsTenant);
  const unions = needsTenant ? pickedUnions : contextUnions;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(true);
  // Which single-holder posts are already filled, so a taken উপজেলা/ইউনিয়ন/ওয়ার্ড is marked in
  // the list rather than only refused on submit.
  const [filled, setFilled] = useState<FilledPosts | null>(null);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  // Where an officer works is part of the role: a UP Sochib serves one union, an FWA one ward
  // within it. The API enforces this too — these fields only appear when they apply.
  const needsUnion = f.role === 'fwa' || f.role === 'up_sochib';
  const needsWard = f.role === 'fwa';

  useEffect(() => {
    if (!open) return;
    getFilledPosts().then(setFilled).catch(() => setFilled(null));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setF(lockedRole ? { role: lockedRole } : {});
    setErr(null);
    setActive(true);
    setTenantId(selectedUpazilaId);
  }, [open, lockedRole, selectedUpazilaId]);

  useEffect(() => {
    if (!open || !needsTenant) return;
    listSwitchableUpazilas()
      .then((r) => setUpazilas(r.upazilas))
      .catch(() => setUpazilas([]));
  }, [open, needsTenant]);

  // Whatever upazila is chosen here decides the union list — an FWA is posted to a union of the
  // upazila the account is being created in, not of whatever the console is switched to.
  useEffect(() => {
    if (!needsTenant || !tenantId) {
      setPickedUnions([]);
      return;
    }
    listUnionsOf(tenantId)
      .then((r) => setPickedUnions(r.unions.map((u) => ({ value: String(u.id), label: u.name_bn }))))
      .catch(() => setPickedUnions([]));
  }, [needsTenant, tenantId]);

  // The district of the chosen upazila, so reopening on an already-selected one lands right.
  useEffect(() => {
    const chosen = upazilas.find((u) => u.id === tenantId);
    if (chosen?.district_id) setDistrictId(String(chosen.district_id));
  }, [upazilas, tenantId]);

  const districts = [...new Map(
    upazilas.filter((u) => u.district_id).map((u) => [String(u.district_id), u.district ?? '']),
  )].sort((a, b) => a[1].localeCompare(b[1], 'bn'));
  // A DC needs only the district; every other role needs the upazila.
  // A SEAL admin oversees the whole platform, so it belongs to no district and no upazila —
  // asking for either would be asking for something the account cannot have.
  const isGlobalRole = f.role === 'seal_admin';

  // A UNO provisions into their own upazila, which the server forces anyway; SEAL picks one.
  const scopeTenant = needsTenant ? tenantId : (user?.tenant_id ?? null);
  // Greyed and small: a note about the option, not part of its name.
  const mark = (label: string, taken: boolean) => (taken
    ? (
      <>
        {label}
        <Box component="span" sx={{ color: 'text.disabled', fontSize: 12.5, ml: 0.75 }}>
          {S.officers.postTaken}
        </Box>
      </>
    )
    : label);
  const held = (list: string[] | number[] | undefined, key: string | number) =>
    !!filled && (list as (string | number)[] | undefined)?.includes(key) === true;
  const wardTaken = f.role === 'fwa' && !!f.ward_no
    && held(filled?.fwa, `${scopeTenant}:${f.union_id}:${f.ward_no}`);
  const missingTenant = needsTenant && !isGlobalRole && (f.role === 'dc' ? !districtId : !tenantId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await createOfficer({
        name: f.name,
        username: f.username,
        password: f.password,
        role: f.role,
        designation: f.designation,
        phone: f.phone,
        email: f.email,
        is_active: active,
        ward_no: f.ward_no ? Number(f.ward_no) : undefined,
        union_id: f.union_id ? Number(f.union_id) : undefined,
        // UNO's tenant is forced server-side; SEAL provisions into the upazila picked above. A
        // জেলা প্রশাসক belongs to a district instead — no upazila of their own.
        ...(needsTenant && tenantId && !isGlobalRole && f.role !== 'dc' ? { tenant_id: tenantId } : {}),
        ...(needsTenant && !isGlobalRole && f.role === 'dc' && districtId ? { district_id: Number(districtId) } : {}),
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog open={open} title={title ?? S.officers.createTitle} onClose={onClose} onSubmit={submit} submitLabel={S.officers.create} submitting={busy || missingTenant}>
      {err && <Alert severity="error">{err}</Alert>}
      {/* First: what kind of account this is. Everything below depends on it — a DC has no
          upazila, an FWA needs a ward — so asking last meant filling fields that then changed. */}
      <SelectField
        label={S.officers.fRole}
        value={f.role ?? ''}
        onChange={set('role')}
        options={roles.map((r) => ({ value: r.value, label: r.label }))}
        placeholder="নির্বাচন করুন"
        disabled={!!lockedRole}
      />
      {needsTenant && !isGlobalRole && (
        <>
          <SelectField
            label={S.officers.fDistrict}
            value={districtId}
            onChange={(v) => {
              setDistrictId(v);
              setTenantId(null); // the old upazila belongs to the old district
            }}
            options={districts.map(([id, name]) => ({
              value: id,
              label: mark(name, f.role === 'dc' && held(filled?.dc, Number(id))),
            }))}
            placeholder="নির্বাচন করুন"
          />
          {f.role !== 'dc' && (
          <SelectField
            label={S.officers.fUpazila}
            value={tenantId ?? ''}
            onChange={(v) => setTenantId(v || null)}
            options={upazilas
              .filter((u) => !districtId || String(u.district_id) === districtId)
              .map((u) => ({
                value: u.id,
                    label: mark(u.name_bn, f.role === 'uno' && held(filled?.uno, u.id)),
              }))}
            placeholder="নির্বাচন করুন"
          />
          )}
        </>
      )}
      {/* Where the post is, finished before who fills it: a সচিব serves one union and an FWA one
          ward, and the duplicate-post check keys off exactly these. */}
      {needsUnion && (
        <SelectField
          label={S.officers.fUnion}
          value={f.union_id ?? ''}
          onChange={set('union_id')}
          options={unions.map((u) => ({
            ...u,
            label: mark(u.label, f.role === 'up_sochib' && held(filled?.up_sochib, `${scopeTenant}:${u.value}`)),
          }))}
          placeholder="নির্বাচন করুন"
        />
      )}
      {needsWard && (
        <FormField
          label={S.officers.fWard}
          value={f.ward_no ?? ''}
          onChange={set('ward_no')}
          type="number"
          // FormField has no helper line, but `action` sits on the label row — which is where the
          // marker belongs anyway, beside ওয়ার্ড নং.
          action={wardTaken
            ? <Typography sx={{ fontSize: 12.5, color: 'text.disabled', ml: 1 }}>{S.officers.postTaken}</Typography>
            : undefined}
        />
      )}
      <FormField label={S.officers.fName} value={f.name ?? ''} onChange={set('name')} />
      <FormField label={S.officers.fUsername} value={f.username ?? ''} onChange={set('username')} />
      <FormField label={S.officers.fPassword} value={f.password ?? ''} onChange={set('password')} type="password" />
      <FormField label={S.officers.fDesignation} value={f.designation ?? ''} onChange={set('designation')} />
      <FormField label={S.officers.fMobile} value={f.phone ?? ''} onChange={set('phone')} placeholder="01XXXXXXXXX" />
      <FormField label={S.officers.fEmail} value={f.email ?? ''} onChange={set('email')} type="email" />
      <FormControlLabel
        control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
        label={active ? S.officers.active : S.officers.inactive}
      />
    </AppDialog>
  );
}
