// Sample in-app notifications (SURAHA_BUILD_PROMPT §9 — in-app only). Real notifications
// are emitted by the modules (Milestones 3–10); these render the bell panel for review.

export type NotifModule = 'pregnancy' | 'birth' | 'complaint' | 'appointment';

export type Notification = {
  id: number;
  module: NotifModule;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
};

export const notifications: Notification[] = [
  {
    id: 1,
    module: 'pregnancy',
    title: 'নতুন প্রসূতি তথ্য যুক্ত হয়েছে',
    detail: 'রিশা আক্তার — গলাচিপা ইউনিয়ন, ওয়ার্ড নং ০১',
    time: '৫ মিনিট আগে',
    unread: true,
  },
  {
    id: 2,
    module: 'pregnancy',
    title: 'ডেলিভারি নিশ্চিত করা হয়েছে',
    detail: 'সাবিনা — সিদ্দিকপুর, অনুমোদনের অপেক্ষায়',
    time: '২০ মিনিট আগে',
    unread: true,
  },
  {
    id: 3,
    module: 'birth',
    title: 'নতুন জন্ম সনদ তৈরি হয়েছে',
    detail: 'মোহিত সিদ্দিকী — নিবন্ধন নম্বর প্রস্তুত',
    time: '১ ঘণ্টা আগে',
    unread: true,
  },
  {
    id: 4,
    module: 'complaint',
    title: 'নতুন অভিযোগ দাখিল হয়েছে',
    detail: 'খেয়াঘাটে বিশৃঙ্খল ভাবে গাড়ি পার্কিং',
    time: '২ ঘণ্টা আগে',
    unread: true,
  },
  {
    id: 5,
    module: 'complaint',
    title: 'তদন্ত প্রতিবেদন জমা হয়েছে',
    detail: 'রিফাত চৌধুরী — নিষ্পত্তির জন্য প্রস্তুত',
    time: '৩ ঘণ্টা আগে',
    unread: false,
  },
  {
    id: 6,
    module: 'appointment',
    title: 'নতুন সাক্ষাৎকারের আবেদন',
    detail: 'আবিদুর রহমান — আর্থিক সাহায্য',
    time: 'গতকাল',
    unread: false,
  },
  {
    id: 7,
    module: 'appointment',
    title: 'সাক্ষাৎকার অনুমোদিত হয়েছে',
    detail: 'রিয়াদ হাসান — ২৭/০১/২৬, সকাল ১০:০০',
    time: 'গতকাল',
    unread: false,
  },
];

export const unreadCount = notifications.filter((n) => n.unread).length;
