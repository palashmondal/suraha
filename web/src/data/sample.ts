import type { StatusTone } from '../components/StatusPill';

// Sample content mirroring concept_ui/Dashboard.png. Real data arrives with the modules
// (Milestones 3–9); this exists only to render the shell faithfully for review.

export type ListEntry = {
  title: string;
  who: string;
  date: string; // short dd/mm/yy in Bangla, as shown on the dashboard cards
  status?: { label: string; tone: StatusTone };
};

export const appointments: ListEntry[] = [
  { title: 'আর্থিক সাহায্য', who: 'আবিদুর রহমান, পৌরসভা- গোলখালী ইউনিয়ন, ওয়ার্ড নং- ২', date: '২৫/০১/২৬' },
  { title: 'সৌজন্য সাক্ষাৎ', who: 'রিয়াদ হাসান, পৌরসভা- গোলখালী ইউনিয়ন, ওয়ার্ড নং- ২', date: '২৫/০১/২৬' },
  { title: 'শিক্ষা সহায়তা', who: 'সালমা বেগম, পৌরসভা- সাপলেজা ইউনিয়ন, ওয়ার্ড নং- ৩', date: '২৫/০১/২৬' },
  { title: 'স্বাস্থ্য সেবা', who: 'মোহাম্মদ জাহিদ, পৌরসভা- মিজ্জাপুর ইউনিয়ন, ওয়ার্ড নং- ১', date: '২৫/০১/২৬' },
  { title: 'স্বাস্থ্য সেবা', who: 'মোহাম্মদ জাহিদ, পৌরসভা- মিজ্জাপুর ইউনিয়ন, ওয়ার্ড নং- ১', date: '২৫/০১/২৬' },
];

export const complaints: ListEntry[] = [
  { title: 'গ্যাসের অস্বাভাবিক মূল্যবৃদ্ধি', who: 'আবিদুর রহমান, পৌরসভা- গোলখালী ইউনিয়ন, ওয়ার্ড নং- ২', date: '২৫/০১/২৬' },
  { title: 'একটি অনিয়ম সংক্রান্ত অভিযোগ জানানো প্রসঙ্গে', who: 'রিয়াদ হাসান, পৌরসভা- গোলখালী ইউনিয়ন, ওয়ার্ড নং- ২', date: '২৫/০১/২৬' },
  { title: 'পণ্য সরবরাহে বিলম্ব সংক্রান্ত সমস্যা', who: 'সালমা বেগম, পৌরসভা- সাপলেজা ইউনিয়ন, ওয়ার্ড নং- ৩', date: '২৫/০১/২৬' },
  { title: 'পণ্য সরবরাহে বিলম্ব সংক্রান্ত সমস্যা', who: 'মোহাম্মদ জাহিদ, পৌরসভা- মিজ্জাপুর ইউনিয়ন, ওয়ার্ড নং- ১', date: '২৫/০১/২৬' },
  { title: 'পণ্য সরবরাহে বিলম্ব সংক্রান্ত সমস্যা', who: 'মোহাম্মদ জাহিদ, পৌরসভা- মিজ্জাপুর ইউনিয়ন, ওয়ার্ড নং- ১', date: '২৫/০১/২৬' },
];

export type SlideEntry = { title: string; date: string; thumb: string; running: boolean };
export const slides: SlideEntry[] = [
  { title: '১২ অক্টোবর থেকে দেশব্যাপী টাইফয়েড টিকাদান ক্যাম্প…', date: '২৫/০১/২৬', thumb: '/sample-slide-thumb.png', running: true },
  { title: 'জরায়ু ক্যান্সার প্রতিরোধে এইচপিভি টিকা', date: '২৫/০১/২৬', thumb: '/sample-slide-thumb.png', running: true },
  { title: 'জরায়ু ক্যান্সার প্রতিরোধে এইচপিভি টিকা', date: '২৫/০১/২৬', thumb: '/sample-slide-thumb.png', running: false },
];

export const heroSlide = { title: '১২ অক্টোবর থেকে দেশব্যাপী টাইফয়েড টিকাদান ক্যাম্প…', image: '/sample-slider.png' };
