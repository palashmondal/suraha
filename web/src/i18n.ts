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

  auth: {
    officerTitle: 'কর্মকর্তা লগইন',
    officerSubtitle: 'ব্যবহারকারীর নাম ও পাসওয়ার্ড দিয়ে প্রবেশ করুন',
    username: 'ব্যবহারকারীর নাম',
    password: 'পাসওয়ার্ড',
    login: 'লগইন করুন',
    citizenTitle: 'নাগরিক প্রবেশ',
    citizenSubtitle: 'মোবাইল নম্বর দিয়ে প্রবেশ করুন',
    mobile: 'মোবাইল নম্বর',
    sendOtp: 'কোড পাঠান',
    otp: 'যাচাই কোড (OTP)',
    otpSent: 'আপনার মোবাইলে একটি ৬-সংখ্যার কোড পাঠানো হয়েছে',
    verify: 'যাচাই করে প্রবেশ',
    changeMobile: 'নম্বর পরিবর্তন করুন',
    resendOtp: 'কোড পুনরায় পাঠান',
    citizenSwitch: 'নাগরিক হিসেবে প্রবেশ',
    officerSwitch: 'কর্মকর্তা হিসেবে প্রবেশ',
    demoRole: 'ডেমো রোল (ব্যাকএন্ড ছাড়া)',
    demoHint: 'ব্যাকএন্ড এখনো যুক্ত হয়নি — যেকোনো তথ্য দিয়ে নির্বাচিত রোলে প্রবেশ করা যাবে।',
    invalidOtp: 'সঠিক ৬-সংখ্যার কোড দিন',
    required: 'এই তথ্যটি আবশ্যক',
  },

  citizen: {
    home: 'হোম',
    services: 'সেবাসমূহ',
    myApplications: 'আমার আবেদন',
    notices: 'নোটিশ',
    profile: 'প্রোফাইল',
    greeting: 'স্বাগতম',
    fileComplaint: 'অভিযোগ দাখিল',
    fileComplaintDesc: 'সমস্যা বা অনিয়ম সম্পর্কে অভিযোগ জানান',
    bookAppointment: 'সাক্ষাৎকারের আবেদন',
    bookAppointmentDesc: 'উপজেলা নির্বাহী কর্মকর্তার সাক্ষাৎ চান',
    trackTitle: 'আবেদনের অবস্থা',
    trackDesc: 'আপনার অভিযোগ ও সাক্ষাৎকারের অগ্রগতি দেখুন',
    noticesTitle: 'নোটিশ ও তথ্য',
    noticesDesc: 'উপজেলা প্রশাসনের ঘোষণা ও তথ্য',
    recentApplications: 'সাম্প্রতিক আবেদন',
    viewAll: 'সব দেখুন',
    complaint: 'অভিযোগ',
    appointment: 'সাক্ষাৎকার',
    subject: 'বিষয়',
    description: 'বিস্তারিত',
    address: 'ঠিকানা',
    union: 'ইউনিয়ন / পৌরসভা',
    ward: 'ওয়ার্ড',
    attachment: 'সংযুক্তি',
    attachmentHelp: 'ছবি বা পিডিএফ যুক্ত করুন (ঐচ্ছিক)',
    useLocation: 'বর্তমান অবস্থান যুক্ত করুন',
    locationCaptured: 'অবস্থান যুক্ত হয়েছে',
    submit: 'জমা দিন',
    reason: 'সাক্ষাৎকারের কারণ',
    preferredDate: 'পছন্দের তারিখ',
    contactMobile: 'যোগাযোগের মোবাইল',
    submitted: 'আপনার আবেদন জমা হয়েছে',
    queued: 'ইন্টারনেট নেই — আবেদনটি সংরক্ষিত হয়েছে, সংযোগ ফিরলে স্বয়ংক্রিয়ভাবে পাঠানো হবে',
    emptyApplications: 'এখনো কোনো আবেদন নেই',
    emptyNotices: 'এখন কোনো নোটিশ নেই',
    filedOn: 'দাখিলের তারিখ',
    logout: 'লগ আউট',
  },

  offline: {
    offline: 'অফলাইন',
    online: 'অনলাইন',
    banner: 'ইন্টারনেট সংযোগ নেই — আপনার তথ্য সংরক্ষিত হচ্ছে',
    pendingSync: 'সিঙ্ক অপেক্ষমাণ',
    pendingOne: 'টি আবেদন পাঠানো বাকি',
    syncing: 'সিঙ্ক হচ্ছে…',
    syncNow: 'এখন সিঙ্ক করুন',
    allSynced: 'সব তথ্য সিঙ্ক হয়েছে',
    failed: 'পাঠানো যায়নি',
  },

  pwa: {
    installTitle: 'অ্যাপটি ইনস্টল করুন',
    installBody: 'হোম স্ক্রিনে যুক্ত করে দ্রুত ও অফলাইনে ব্যবহার করুন',
    install: 'ইনস্টল',
    dismiss: 'পরে',
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
