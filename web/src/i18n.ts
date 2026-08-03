import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Bangla-only UI (SURAHA_BUILD_PROMPT §1.1(5)). All UI copy is centralized here so it
// stays maintainable; there is intentionally no language switcher.
export const bnStrings = {
  appName: 'সুরাহা',
  currentUpazila: 'গলাচিপা উপজেলা, বরিশাল',

  nav: {
    dashboard: 'ড্যাশবোর্ড',
    pregnancy: 'প্রসূতি কল্যাণ',
    birth: 'জন্ম নিবন্ধন',
    appointment: 'সাক্ষাৎকার',
    complaint: 'অভিযোগ',
    slider: 'ইমেজ স্লাইডার',
    list: 'তালিকা',
    report: 'রিপোর্ট',
    allList: 'সকল তালিকা',
    officerList: 'কর্মকর্তা তালিকা',
    sectionOfficer: 'কর্মকর্তা',
    designation: 'পদবী',
    sectionGeneral: 'সাধারণ তথ্য',
    phones: 'প্রয়োজনীয় ফোন নাম্বার',
    aboutUpazila: 'উপজেলা সম্পর্কিত',
  },

  common: {
    details: 'বিস্তারিত',
    all: 'সকল',
    addNew: 'নতুন যুক্ত করুন',
    liveLocation: 'লাইভ লোকেশন',
    goTo: 'Go to',
    noData: 'কোনো তথ্য নাই',
    noDataHelp: 'কোনো তথ্য পাওয়া যায়নি। নতুন তথ্য যুক্ত করুন',
    person: 'জন',
    count: 'টি',
  },

  profile: {
    name: 'মহিউদ্দিন আল হেলাল',
    designation: 'উপজেলা নির্বাহী অফিসার, গলাচিপা',
    view: 'প্রোফাইল',
    changePassword: 'পাসওয়ার্ড পরিবর্তন',
    logout: 'লগ আউট',
  },

  notifications: {
    title: 'নোটিফিকেশন',
    unreadSuffix: 'টি নতুন',
    markAll: 'সব পড়া হয়েছে',
    viewAll: 'সকল নোটিফিকেশন দেখুন',
    empty: 'কোনো নোটিফিকেশন নেই',
  },

  dashboard: {
    title: 'ড্যাশবোর্ড',
    officer: {
      title: 'কর্মকর্তা',
      totalHealthWorker: 'মোট স্বাস্থ্যকর্মী',
      totalFpWorker: 'মোট পরিবার পরিকল্পনা কর্মী',
      totalSochib: 'মোট ইউপি সচিব',
    },
    pregnancy: {
      title: 'প্রসূতি কল্যাণ',
      todayNew: 'আজকের নতুন প্রসূতি',
      total: 'মোট প্রসূতি',
      totalDelivery: 'মোট ডেলিভারী',
    },
    birth: {
      title: 'জন্ম সনদ',
      todayNew: 'আজকের নতুন জন্ম সনদ',
      total: 'মোট জন্ম সনদ',
      pendingEntry: 'কার্যকর কিন্তু এন্ট্রি হয়নি',
    },
    appointment: {
      title: 'সাক্ষাৎকার',
      requests: 'সাক্ষাতকারের আবেদন',
    },
    complaint: {
      title: 'অভিযোগ',
      requests: 'অভিযোগের আবেদন',
    },
    slider: { title: 'স্লাইডার ইমেজ' },
  },

  status: {
    pending: 'পেন্ডিং আছে',
    approved: 'অনুমোদিত',
    scheduled: 'শিডিউল করা হয়েছে',
    officerAssigned: 'কর্মকর্তা নিযুক্ত',
    running: 'চলমান',
    stopped: 'বন্ধ আছে',
  },
} as const;

void i18n.use(initReactI18next).init({
  lng: 'bn',
  fallbackLng: 'bn',
  resources: { bn: { translation: bnStrings } },
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export default i18n;
