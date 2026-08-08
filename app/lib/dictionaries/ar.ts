import type { Dictionary } from "./index";

// Modern Standard Arabic, clinical/academic register. The brand remains Latin.
export const ar: Dictionary = {
  brand: { name: "Smart Surgical Team", short: "SST", tagline: "جراحة الرأس والعنق، بقيادة الخبرة.", location: "برج الصحة الذكي · السليمانية، كردستان" },
  nav: { home: "الرئيسية", about: "من نحن", topics: "المحتوى", library: "المكتبة", webinars: "الندوات الإلكترونية", events: "الفعاليات", research: "البحوث", team: "فريقنا", contact: "اتصل بنا", signIn: "تسجيل الدخول", register: "إنشاء حساب", skipToContent: "تخطي إلى المحتوى", languageLabel: "اللغة", menu: "القائمة", close: "إغلاق" },
  cta: { exploreLibrary: "تصفّح المكتبة", viewAll: "عرض الكل", learnMore: "اعرف المزيد" },
  topics: {
    kicker: "المواضيع", title: "تصفّح حسب الموضوع", intro: "أربعة مسارات جراحية متخصّصة لدراسة منهجية في جراحة الرأس والعنق.",
    exploreGroup: "استكشف الموضوع", guideKicker: "دليل تشريحي", guideTitle: "ابدأ من المنطقة",
    guideIntro: "اختر منطقة مميّزة أو إحدى بطاقات المواضيع للانتقال من الرأس والعنق ككل إلى عرض جراحي مركّز.",
    guideIntroActive: "التركيز على {name}. تصفّح المحتوى المنشور حسب الموضوع أو الصيغة.",
    chooseRegion: "اختر منطقة في الأعلى وستظهر مجالات التركيز الخاصة بها هنا.", mapReset: "العودة إلى الرأس والعنق كاملاً",
    focusAreas: "مجالات التركيز", conditions: "الحالات المرضية", conditionCases: "الحالات", caseVideoLabel: "فيديو الحالة",
    caseReadLabel: "دراسة حالة", minRead: "دقيقة قراءة", caseEmptyTitle: "لا يوجد محتوى منشور بعد",
    caseEmptyBody: "سيظهر هنا المحتوى المنشور الخاص بهذا الموضوع.", collectionKicker: "مجموعة تعليمية",
    collectionTitle: "مجموعة تعليمية", collectionBody: "تظهر هنا مقاطع العمليات الجراحية ومراجعات التصوير والمناقشات المنشورة.",
    backToTopics: "جميع المواضيع", otherTopics: "واصل الاستكشاف",
  },
  footer: { rights: "جميع الحقوق محفوظة.", quickLinks: "روابط سريعة", contactUs: "اتصل بنا", blurb: "منصّة أكاديمية متخصّصة في تعليم جراحة الرأس والعنق. خبرة متعمّقة، ونتائج أفضل.", privacy: "سياسة الخصوصية", terms: "شروط الاستخدام", hours: "السبت – الخميس، 9:00 – 17:00" },
  common: { loading: "جارٍ التحميل", comingSoon: "قريباً" },
};
