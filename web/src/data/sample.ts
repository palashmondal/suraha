import type { StatusTone } from '../components/StatusPill';

// Sample content mirroring concept_ui/Dashboard.png. Real data arrives with the modules
// (Milestones 3–9); this exists only to render the shell faithfully for review.

export type ListEntry = {
  title: string;
  who: string;
  date: string;
  status: { label: string; tone: StatusTone };
  liveLocation?: boolean;
};

export const appointments: ListEntry[] = [
  {
    title: 'আর্থিক সাহায্য',
    who: 'আবিদুর রহমান, পৌরসভা- গোলখালী ইউনিয়ন, ওয়ার্ড নং- ২',
    date: '২৫ জানুয়ারী ২০২৬',
    status: { label: 'পেন্ডিং আছে', tone: 'pending' },
  },
  {
    title: 'সৌজন্য সাক্ষাৎ',
    who: 'রিয়াদ হাসান, পৌরসভা- গোলখালী ইউনিয়ন, ওয়ার্ড নং- ২',
    date: '২৭ জানুয়ারী ২০২৬',
    status: { label: 'অনুমোদিত', tone: 'success' },
  },
  {
    title: 'শিক্ষা সহায়তা',
    who: 'সালমা বেগম, পৌরসভা- সাপলেজা ইউনিয়ন, ওয়ার্ড নং- ৩',
    date: '৩০ জানুয়ারী ২০২৬',
    status: { label: 'পেন্ডিং আছে', tone: 'pending' },
  },
  {
    title: 'স্বাস্থ্য সেবা',
    who: 'মোহাম্মদ জাহিদ, পৌরসভা- মিজ্জাপুর ইউনিয়ন, ওয়ার্ড নং- ১',
    date: '২৭ জানুয়ারী ২০২৬',
    status: { label: 'অনুমোদিত', tone: 'success' },
  },
];

export const complaints: ListEntry[] = [
  {
    title: 'গ্যাসের অস্বাভাবিক মূল্যবৃদ্ধি',
    who: 'গোলাখালী বাজার, পৌরসভা- গোলখালী ইউনিয়ন, ওয়ার্ড নং- ২',
    date: '৬ জানুয়ারী ২০২৬',
    status: { label: 'পেন্ডিং আছে', tone: 'pending' },
    liveLocation: true,
  },
  {
    title: 'একটি অনিয়ম সংক্রান্ত অভিযোগ জানানো প্রসঙ্গে',
    who: 'গোলাখালী বাজার, পৌরসভা- গোলখালী ইউনিয়ন, ওয়ার্ড নং- ২',
    date: '৪ জানুয়ারী ২০২৬',
    status: { label: 'শিডিউল করা হয়েছে', tone: 'info' },
    liveLocation: true,
  },
  {
    title: 'পণ্য সরবরাহে বিলম্ব সংক্রান্ত সমস্যা',
    who: 'গোলাখালী বাজার, পৌরসভা- গোলখালী ইউনিয়ন, ওয়ার্ড নং- ২',
    date: '৮ জানুয়ারী ২০২৬',
    status: { label: 'কর্মকর্তা নিযুক্ত', tone: 'success' },
    liveLocation: true,
  },
];

export type SlideEntry = { title: string; running: boolean };
export const slides: SlideEntry[] = [
  { title: 'জরায়ু ক্যান্সার প্রতিরোধে এইচপিভি টিকা', running: true },
  { title: '১২ অক্টোবর থেকে দেশব্যাপী টাইফয়েড টিকাদান ক্যাম্প…', running: true },
];
