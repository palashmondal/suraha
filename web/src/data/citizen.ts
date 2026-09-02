import type { StatusTone } from '../components/StatusPill';

// Sample citizen-facing data mirroring the complaint/appointment lifecycles (SURAHA_BUILD_PROMPT §7).
// Real data arrives with the modules (Milestones 5–7); this renders the mobile area for review.

export type ApplicationKind = 'complaint' | 'appointment';

export type TimelineEvent = {
  label: string; // Bangla stage label
  at: string; // Bangla date-time
  done: boolean;
};

export type CitizenApplication = {
  id: string;
  kind: ApplicationKind;
  title: string;
  status: { label: string; tone: StatusTone };
  filedOn: string; // Bangla date
  timeline: TimelineEvent[];
};

export const sampleApplications: CitizenApplication[] = [
  {
    id: 'CMP-2401',
    kind: 'complaint',
    title: 'গ্যাসের অস্বাভাবিক মূল্যবৃদ্ধি',
    status: { label: 'তদন্তকারী যুক্ত', tone: 'info' },
    filedOn: '২০/০১/২৬',
    timeline: [
      { label: 'অভিযোগ দাখিল', at: '২০/০১/২৬, ১০:১৫', done: true },
      { label: 'শিডিউল যুক্ত', at: '২১/০১/২৬, ১১:৩০', done: true },
      { label: 'তদন্তকারী যুক্ত', at: '২২/০১/২৬, ০৯:০০', done: true },
      { label: 'তদন্ত প্রতিবেদন', at: '', done: false },
      { label: 'নিষ্পত্তি', at: '', done: false },
    ],
  },
  {
    id: 'APT-1187',
    kind: 'appointment',
    title: 'সৌজন্য সাক্ষাৎ',
    status: { label: 'অনুমোদিত', tone: 'success' },
    filedOn: '১৮/০১/২৬',
    timeline: [
      { label: 'আবেদন জমা', at: '১৮/০১/২৬, ১৪:০০', done: true },
      { label: 'অনুমোদিত', at: '১৯/০১/২৬, ১০:০০', done: true },
    ],
  },
  {
    id: 'CMP-2388',
    kind: 'complaint',
    title: 'পণ্য সরবরাহে বিলম্ব সংক্রান্ত সমস্যা',
    status: { label: 'নিষ্পত্তি', tone: 'success' },
    filedOn: '১০/০১/২৬',
    timeline: [
      { label: 'অভিযোগ দাখিল', at: '১০/০১/২৬, ০৯:৪০', done: true },
      { label: 'শিডিউল যুক্ত', at: '১১/০১/২৬, ১২:০০', done: true },
      { label: 'তদন্তকারী যুক্ত', at: '১২/০১/২৬, ১০:০০', done: true },
      { label: 'তদন্ত প্রতিবেদন', at: '১৫/০১/২৬, ১৬:০০', done: true },
      { label: 'নিষ্পত্তি', at: '১৬/০১/২৬, ১১:০০', done: true },
    ],
  },
];

export type Notice = {
  id: string;
  title: string;
  body: string;
  publishedOn: string; // Bangla date
  unread: boolean;
};

// UNO notices / updates shared with citizens (SURAHA_BUILD_PROMPT §8.8).
export const sampleNotices: Notice[] = [
  {
    id: 'N-31',
    title: '১২ অক্টোবর থেকে দেশব্যাপী টাইফয়েড টিকাদান ক্যাম্প',
    body: 'আগামী ১২ অক্টোবর থেকে উপজেলার সকল ইউনিয়নে টাইফয়েড টিকাদান কার্যক্রম শুরু হবে। ৯ মাস থেকে ১৫ বছর বয়সী শিশুরা নিকটস্থ কেন্দ্র থেকে বিনামূল্যে টিকা নিতে পারবে।',
    publishedOn: '২৫/০১/২৬',
    unread: true,
  },
  {
    id: 'N-30',
    title: 'ভূমি অফিসের সেবা সপ্তাহ',
    body: 'আগামী সপ্তাহে উপজেলা ভূমি অফিসে বিশেষ সেবা সপ্তাহ পালিত হবে। নামজারি ও খাজনা সংক্রান্ত সেবা দ্রুততার সাথে প্রদান করা হবে।',
    publishedOn: '২২/০১/২৬',
    unread: true,
  },
  {
    id: 'N-29',
    title: 'বাল্যবিবাহ প্রতিরোধে সচেতনতা সভা',
    body: 'উপজেলা প্রশাসনের উদ্যোগে বাল্যবিবাহ প্রতিরোধে সচেতনতামূলক সভা অনুষ্ঠিত হবে। সকল অভিভাবককে অংশগ্রহণের জন্য অনুরোধ করা হলো।',
    publishedOn: '১৯/০১/২৬',
    unread: false,
  },
];
