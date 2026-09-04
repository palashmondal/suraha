import { useEffect, useState, type ReactNode } from 'react';
import { Box, Button, IconButton, Link, Paper, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { bn, bnDate } from '../../utils/bnNum';
import { bnAge } from '../../utils/timeAgo';
import DetailRow from '../../components/DetailRow';
import SectionTitle from '../../components/SectionTitle';
import StatusPill from '../../components/StatusPill';
import { getBirthReg, downloadCertificate, type BirthReg } from '../../api/birthReg';

const dash = (v: string | number | null | undefined) => (v == null || v === '' ? '—' : String(v));

/** Two fields per row on a desktop, one on a phone — the same dense layout as the mother's record. */
function Fields({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        columnGap: 3,
        mb: 2,
        '& > *': { borderBottom: '1px solid', borderColor: 'divider' },
      }}
    >
      {children}
    </Box>
  );
}

export default function BirthRegDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [r, setR] = useState<BirthReg | null>(null);

  useEffect(() => {
    if (id) getBirthReg(id).then((res) => setR(res.data)).catch(() => setR(null));
  }, [id]);

  if (!r) return null;

  const sex = r.sex === 'male' ? S.birthReg.boy : r.sex === 'female' ? S.birthReg.girl : '—';

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper elevation={0} sx={{ borderRadius: '16px', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate('/birth')}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography sx={{ fontSize: 19, fontWeight: 700 }}>
          {S.birthReg.detailTitle} - {r.child_name ?? r.mother_name}
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          {r.has_certificate && (
            <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadCertificate(r)}>
              {S.birthReg.downloadCert}
            </Button>
          )}
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
        <SectionTitle>{S.birthReg.secChild}</SectionTitle>
        <Fields>
          <DetailRow label={S.birthReg.childName} value={dash(r.child_name)} divider={false} />
          <DetailRow label={S.birthReg.childNameEn} value={dash(r.child_name_en)} divider={false} />
          <DetailRow label={S.birthReg.dob} value={r.date_of_birth ? bnDate(r.date_of_birth) : '—'} divider={false} />
          <DetailRow label={S.birthReg.colAge} value={bnAge(r.date_of_birth)} divider={false} />
          <DetailRow label={S.birthReg.sex} value={sex} divider={false} />
          {/* Filed → the number itself; not yet filed → that field says so, rather than a bare dash. */}
          <DetailRow
            label={S.birthReg.colRegNo}
            value={
              r.registration_no ? bn(r.registration_no) : <StatusPill label={r.status_label} tone={r.status_tone} />
            }
            divider={false}
          />
        </Fields>

        <SectionTitle>{S.birthReg.secMother}</SectionTitle>
        <Fields>
          <DetailRow
            label={S.birthReg.motherName}
            // The মায়ের প্রসূতি record is where her full history lives; a manual entry has none.
            value={
              r.pregnancy_id ? (
                <Link component="button" underline="hover" onClick={() => navigate(`/pregnancy/${r.pregnancy_id}`)}>
                  {r.mother_name}
                </Link>
              ) : (
                r.mother_name
              )
            }
            divider={false}
          />
          <DetailRow label={S.birthReg.motherNameEn} value={dash(r.mother_name_en)} divider={false} />
          <DetailRow label={S.birthReg.nid} value={r.mother_nid ? bn(r.mother_nid) : '—'} divider={false} />
          <DetailRow label={S.birthReg.brn} value={r.mother_birth_reg_no ? bn(r.mother_birth_reg_no) : '—'} divider={false} />
          <DetailRow label={S.birthReg.nationality} value={dash(r.mother_nationality)} divider={false} />
        </Fields>

        <SectionTitle>{S.birthReg.secFather}</SectionTitle>
        <Fields>
          <DetailRow label={S.birthReg.fatherName} value={dash(r.father_name)} divider={false} />
          <DetailRow label={S.birthReg.fatherNameEn} value={dash(r.father_name_en)} divider={false} />
          <DetailRow label={S.birthReg.nid} value={r.father_nid ? bn(r.father_nid) : '—'} divider={false} />
          <DetailRow label={S.birthReg.brn} value={r.father_birth_reg_no ? bn(r.father_birth_reg_no) : '—'} divider={false} />
          <DetailRow label={S.birthReg.nationality} value={dash(r.father_nationality)} divider={false} />
        </Fields>

        <SectionTitle>{S.birthReg.secPlace}</SectionTitle>
        <Fields>
          <DetailRow label={S.birthReg.placeOfBirth} value={dash(r.place_of_birth)} divider={false} />
          <DetailRow label={S.birthReg.colUpazila} value={dash(r.upazila)} divider={false} />
          <DetailRow label={S.birthReg.colUnion} value={dash(r.union)} divider={false} />
          <DetailRow label={S.birthReg.ward} value={r.ward_no ? bn(r.ward_no) : '—'} divider={false} />
          <Box sx={{ gridColumn: '1 / -1' }}>
            <DetailRow label={S.birthReg.permanentAddress} value={dash(r.permanent_address)} divider={false} />
          </Box>
        </Fields>
      </Paper>
    </Box>
  );
}
