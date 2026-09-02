import { useState } from 'react';
import { Box, Button, Divider, Paper, Stack } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { bnStrings as S } from '../../i18n';
import { bn } from '../../utils/bnNum';

import PageHeader from '../../components/PageHeader';
import SectionTitle from '../../components/SectionTitle';
import StatusPill from '../../components/StatusPill';
import EmptyState from '../../components/EmptyState';
import TableTabs, { type TableTab } from '../../components/TableTabs';
import DataTable, { type Column } from '../../components/DataTable';
import DetailRow from '../../components/DetailRow';
import VerticalStepper from '../../components/VerticalStepper';
import StatusTimeline from '../../components/StatusTimeline';
import SummaryPanel from '../../components/SummaryPanel';
import AppDialog from '../../components/AppDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import { FormField, SelectField, DateField, TimeField, RadioGroupField } from '../../components/form/FormFields';
import FileDropzone from '../../components/form/FileDropzone';

// Component gallery — a visual + interactive reference for the M1 shared library. Every module
// (M3+) composes these. Reachable at /ui.
interface Complaint {
  id: number;
  title: string;
  date: string;
  applicant: string;
  status: { label: string; tone: 'pending' | 'success' | 'danger' | 'info' };
}

const complaints: Complaint[] = [
  { id: 1, title: 'খেয়াঘাটে বিশৃংখল ভাবে গাড়ি পার্কিং', date: '২৩-০১-২৬', applicant: 'রিমন মিয়া', status: { label: 'নিষ্পত্তিহীন', tone: 'pending' } },
  { id: 2, title: 'স্কুলের মাঠে অবৈধ নির্মাণ', date: '২২-০১-২৬', applicant: 'মোশারফ', status: { label: 'শিডিউল যুক্ত', tone: 'info' } },
  { id: 3, title: 'নদীর পাড়ে মাটি কাটা', date: '২৬-০১-২৬', applicant: 'সোহেল', status: { label: 'নিষ্পত্তি সম্পন্ন', tone: 'success' } },
];

const tabs: TableTab[] = [
  { key: 'all', label: 'সকল অভিযোগ', total: 124 },
  { key: 'pending', label: 'নিষ্পত্তিহীন', total: 25, tone: 'pending' },
  { key: 'scheduled', label: 'শিডিউল যুক্ত', total: 36, tone: 'info' },
  { key: 'done', label: 'নিষ্পত্তি সম্পন্ন', total: 36, tone: 'success' },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <SectionTitle>{title}</SectionTitle>
      {children}
      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}

export default function Showcase() {
  const [tab, setTab] = useState('all');
  const [text, setText] = useState('');
  const [group, setGroup] = useState('A+');
  const [sex, setSex] = useState('ছেলে');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [dialog, setDialog] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const columns: Column<Complaint>[] = [
    { key: 'title', header: 'শিরোনাম', render: (r) => <span style={{ fontWeight: 600 }}>{r.title}</span> },
    { key: 'date', header: 'তারিখ' },
    { key: 'applicant', header: 'অভিযোগকারী' },
    {
      key: 'status',
      header: 'বর্তমান অবস্থা',
      render: (r) => <StatusPill label={r.status.label} tone={r.status.tone} />,
    },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 5, pb: 6 }}>
      <PageHeader
        title="ডিজাইন সিস্টেম (M1)"
        onSearch={() => {}}
        onFilter={() => {}}
        primaryLabel={S.common.addNew}
        onPrimary={() => setDialog(true)}
      />

      <Block title="স্ট্যাটাস পিল">
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <StatusPill label="অপেক্ষমান" tone="pending" />
          <StatusPill label="অনুমোদিত" tone="success" />
          <StatusPill label="নাকচ" tone="danger" />
          <StatusPill label="শিডিউল করা হয়েছে" tone="info" />
        </Stack>
      </Block>

      <Block title="ট্যাব + টেবিল">
        <TableTabs tabs={tabs} active={tab} onChange={setTab} />
        <DataTable
          columns={columns}
          rows={complaints}
          onRowClick={() => {}}
          rowActions={(r) => [
            { key: 'view', label: S.profile.view, icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => alert(r.title) },
            { key: 'edit', label: 'সম্পাদনা', icon: <EditRoundedIcon fontSize="small" />, onClick: () => {} },
            { key: 'del', label: 'মুছে ফেলুন', icon: <DeleteOutlineRoundedIcon fontSize="small" />, destructive: true, onClick: () => setConfirm(true) },
          ]}
        />
      </Block>

      <Block title="খালি অবস্থা (Empty state)">
        <Paper elevation={0} sx={{ borderRadius: '16px' }}>
          <EmptyState />
        </Paper>
      </Block>

      <Block title="ফর্ম ফিল্ড">
        <Box sx={{ display: 'grid', gap: 2, maxWidth: 560 }}>
          <FormField label="প্রসূতি মায়ের নাম (বাংলাতে)" value={text} onChange={setText} placeholder="নাম লিখুন" />
          <SelectField
            label="রক্তের গ্রুপ"
            value={group}
            onChange={setGroup}
            options={['A+', 'B+', 'O+', 'AB+'].map((v) => ({ value: v, label: v }))}
          />
          <RadioGroupField
            label="নবজাতকের লিঙ্গ"
            value={sex}
            onChange={setSex}
            options={[{ value: 'ছেলে', label: 'ছেলে' }, { value: 'মেয়ে', label: 'মেয়ে' }]}
          />
          <DateField label="সম্ভাব্য ডেলিভারি তারিখ" value={date} onChange={setDate} />
          <TimeField label="সময়" value={time} onChange={setTime} />
          <FormField label="বিস্তারিত বিবরণ" value={text} onChange={setText} multiline placeholder="বিবরণ লিখুন" />
          <FileDropzone onFile={() => {}} />
        </Box>
      </Block>

      <Block title="ধাপ (Stepper) + ডিটেইল + টাইমলাইন">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          <VerticalStepper
            activeIndex={1}
            steps={[
              { key: 'a', label: 'সাধারণ তথ্য' },
              { key: 'b', label: 'ঠিকানা' },
              { key: 'c', label: 'স্বাস্থ্য সংক্রান্ত তথ্য' },
            ]}
          />
          <Paper elevation={0} sx={{ borderRadius: '16px', p: 2.5 }}>
            <DetailRow label="প্রসূতি মায়ের নাম" value="রিশা আক্তার" />
            <DetailRow label="স্বামীর নাম" value="রিয়াদ হাসান" />
            <DetailRow label="মোবাইল নাম্বার" value={bn('01736485978')} divider={false} />
          </Paper>
          <SummaryPanel
            title="রিমন মিয়া"
            lines={[
              { label: 'মোবাইল', value: bn('01796345678') },
              { label: 'তারিখ', value: '২৫-০১-২০২৬' },
            ]}
          >
            <StatusTimeline
              nodes={[
                { key: '1', label: 'অভিযোগ দাখিল', timestamp: '২৩-০১-২৬', done: true },
                { key: '2', label: 'শিডিউল যুক্ত', done: false },
                { key: '3', label: 'তদন্তকারী যুক্ত', done: false },
                { key: '4', label: 'নিষ্পত্তি', done: false },
              ]}
            />
            <Button variant="contained" fullWidth>শিডিউলযুক্ত করুন</Button>
            <Button variant="outlined" fullWidth>নাকচ করুন</Button>
          </SummaryPanel>
        </Box>
      </Block>

      <Block title="ডায়ালগ">
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={() => setDialog(true)}>ফর্ম ডায়ালগ</Button>
          <Button variant="outlined" color="error" onClick={() => setConfirm(true)}>কনফার্ম ডায়ালগ</Button>
        </Stack>
      </Block>

      <AppDialog
        open={dialog}
        title="নতুন ইমেজ স্লাইডার যুক্ত করুন"
        onClose={() => setDialog(false)}
        onSubmit={(e) => {
          e.preventDefault();
          setDialog(false);
        }}
      >
        <FileDropzone onFile={() => {}} />
        <FormField label="শিরোনাম" value={text} onChange={setText} placeholder="ইমেজের শিরোনাম দিন" />
        <FormField label="URL" value={text} onChange={setText} placeholder="URL link" />
      </AppDialog>

      <ConfirmDialog
        open={confirm}
        title="নিশ্চিত করুন"
        message="আপনি কি নিশ্চিতভাবে এটি মুছে ফেলতে চান?"
        confirmLabel="মুছে ফেলুন"
        destructive
        onConfirm={() => setConfirm(false)}
        onClose={() => setConfirm(false)}
      />
    </Box>
  );
}
