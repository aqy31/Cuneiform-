/**
 * معجم العلامات والرموز المسمارية الأثرية (Borger & Labat Cuneiform Sign Catalog)
 * يحتوي على أشهر الرموز المسمارية مع قراءاتها السومرية والأكدية ومعانيها وتشريح أوتادها
 */
export const cuneiformSignsDictionary = [
  {
    id: "AN",
    sign: "𒀭",
    borger: 13,
    labat: 10,
    sumerian: "AN / DIĜIR",
    akkadian: "Anum / ilu",
    arabicName: "آنو / إيلو (الإله / السماء)",
    meaningArabic: "السماء العليا، رب الأرباب آنو، وتُستخدم أيضاً كبادئة دلالية (Determinative) قبل أسماء الآلهة.",
    meaningEnglish: "Heaven, Sky, God (Determinative for divine names).",
    periodOrigin: "العصر السومري القديم (نشأت كصورة نجمة ذات ثمانية أطراف ✶)",
    wedgeAnatomy: {
      horizontal: 1,
      vertical: 1,
      winkelhaken: 2,
      description: "تتألف العلامة الكلاسيكية من وتد رأسي وأفقي متقاطعين مع وتدين زاويين مائلين يحاكيان إشعاع النجمة القديمة."
    }
  },
  {
    id: "LUGAL",
    sign: "𒈗",
    borger: 151,
    labat: 151,
    sumerian: "LUGAL",
    akkadian: "šarru",
    arabicName: "شارّو (الملك / الحاكم الأعظم)",
    meaningArabic: "الملك، الحاكم، وسيد البلاد؛ مركبة سومرياً من (LÚ: رجل + GAL: عظيم).",
    meaningEnglish: "King, ruler, sovereign (from LU 'man' + GAL 'great').",
    periodOrigin: "عصر فجر السلالات السومرية (رجل عظيم يرتدي تاجاً ذا قرون)",
    wedgeAnatomy: {
      horizontal: 3,
      vertical: 2,
      winkelhaken: 2,
      description: "تركيب متقن من مسامير عريضة أفقية مع أوتاد عمودية ترمز لصدارة القيادة والقوة."
    }
  },
  {
    id: "E2",
    sign: "𒂍",
    borger: 324,
    labat: 324,
    sumerian: "É",
    akkadian: "bītu",
    arabicName: "بيتو (البيت / المعبد / القصر)",
    meaningArabic: "البيت، المسكن، أو المعبد المقدس (مثل: É-SAG-IL معبد مردوخ في بابل، وÉ-KUR معبد إنليل في نيبور).",
    meaningEnglish: "House, temple, estate, palace.",
    periodOrigin: "الرسم الصوري السومري القديم لمخطط جدران وباب منزل من القصب أو الطين",
    wedgeAnatomy: {
      horizontal: 2,
      vertical: 3,
      winkelhaken: 1,
      description: "مجموعة أوتاد تحصر شكلاً صندوقياً مغلقاً يمثل جدران البيت."
    }
  },
  {
    id: "KUR",
    sign: "𒆳",
    borger: 366,
    labat: 366,
    sumerian: "KUR",
    akkadian: "mātu / šadû",
    arabicName: "ماتو / شادو (البلاد / الجبل)",
    meaningArabic: "البلاد، الأرض، الوطن، وأيضاً تعني الجبال أو العالم السفلي المجهول.",
    meaningEnglish: "Land, country, mountain, foreign territory, underworld.",
    periodOrigin: "ثلاثة تلال أو قمم جبلية متجاورة (البلاد الواقعة خلف جبال زاغروس)",
    wedgeAnatomy: {
      horizontal: 0,
      vertical: 1,
      winkelhaken: 3,
      description: "ثلاثة أوتاد زاوية (Winkelhaken) تعلو وتداً عمودياً أو متجاورة كقمم التلال."
    }
  },
  {
    id: "GIS",
    sign: "𒄑",
    borger: 296,
    labat: 296,
    sumerian: "GIŠ",
    akkadian: "iṣu",
    arabicName: "إيصو (الخشب / الشجرة)",
    meaningArabic: "الخشب، الشجر، وتُستخدم كبادئة دلالية قبل أسماء الأدوات والمصنوعات الخشبية كالسفن والعربات.",
    meaningEnglish: "Wood, tree (Determinative before wooden objects, tools, and trees).",
    periodOrigin: "فرع شجرة مورق متفرع",
    wedgeAnatomy: {
      horizontal: 1,
      vertical: 2,
      winkelhaken: 0,
      description: "وتد أفقي طويل يتفرع منه وتدان رأسيان يمثلان الأغصان والجذع."
    }
  },
  {
    id: "GAL",
    sign: "𒃲",
    borger: 343,
    labat: 343,
    sumerian: "GAL",
    akkadian: "rabû",
    arabicName: "رابو (العظيم / الكبير)",
    meaningArabic: "العظيم، الكبير، الشيخ، والقائد؛ صفة إجلال تستخدم للملوك والآلهة والمسؤولين.",
    meaningEnglish: "Great, large, elder, chief.",
    periodOrigin: "رسم رمزي للإتساع والضخامة",
    wedgeAnatomy: {
      horizontal: 2,
      vertical: 1,
      winkelhaken: 1,
      description: "أوتاد منفرجة متسعة تمنح شعوراً بالاتساع والعظمة."
    }
  },
  {
    id: "A",
    sign: "𒀀",
    borger: 579,
    labat: 579,
    sumerian: "A",
    akkadian: "mû / māru",
    arabicName: "مو (الماء / السائل / الابن)",
    meaningArabic: "الماء، الأنهار، السائل الحيوي، وتأتي أيضاً بدلالة الابن والنسل.",
    meaningEnglish: "Water, fluid, heir, son.",
    periodOrigin: "خطان متموجان يمثلان تدفق مياه نهري دجلة والفرات",
    wedgeAnatomy: {
      horizontal: 2,
      vertical: 0,
      winkelhaken: 2,
      description: "أوتاد أفقية وزاوية متوازية تجسد جريان التيار المائي."
    }
  },
  {
    id: "KI",
    sign: "𒆠",
    borger: 461,
    labat: 461,
    sumerian: "KI",
    akkadian: "erṣetu / ašru",
    arabicName: "إرصيتو (الأرض / المكان)",
    meaningArabic: "الأرض، المكان، الموقع، وتُوضع كلاحقة دلالية بعد أسماء المدن والبلدان (مثل: Bābili-KI مدينة بابل).",
    meaningEnglish: "Earth, ground, place (Determinative placed after city and geographic names).",
    periodOrigin: "رقعة أرض محروثة أو مسيجة بحدود",
    wedgeAnatomy: {
      horizontal: 3,
      vertical: 2,
      winkelhaken: 1,
      description: "شبكة متقاطعة من المسامير تشكل رقعة محددة."
    }
  },
  {
    id: "SAG",
    sign: "𒊕",
    borger: 115,
    labat: 115,
    sumerian: "SAG",
    akkadian: "qaqqadu / rēšu",
    arabicName: "ريشو / قاقّادو (الرأس / البداية / الأول)",
    meaningArabic: "الرأس، البداية، الطليعة، الأفضلية (مثل: rēštû الأول أو البكر).",
    meaningEnglish: "Head, beginning, top, chief, vanguard.",
    periodOrigin: "رسم جانبي لرأس إنسان مكتمل الملامح مع شعر وذقن",
    wedgeAnatomy: {
      horizontal: 3,
      vertical: 3,
      winkelhaken: 2,
      description: "رمز مركب كثيف الأوتاد يصور معالم الرأس والوجه البشري."
    }
  },
  {
    id: "SU",
    sign: "𒋗",
    borger: 354,
    labat: 354,
    sumerian: "ŠU",
    akkadian: "qātu",
    arabicName: "قاتو (اليد / القوة / السلطة)",
    meaningArabic: "اليد، القبضة، الفعل، والقدرة، وتستخدم في صيغ العمل والحماية والتملك.",
    meaningEnglish: "Hand, authority, grasp, power.",
    periodOrigin: "كف يد منبسطة بأصابع متفرقة",
    wedgeAnatomy: {
      horizontal: 4,
      vertical: 1,
      winkelhaken: 0,
      description: "أربعة مسامير أفقية تمثل الأصابع الممتدة مع وتد يمثل راحة اليد."
    }
  },
  {
    id: "UD",
    sign: "𒌓",
    borger: 381,
    labat: 381,
    sumerian: "UD",
    akkadian: "ūmu / Šamaš",
    arabicName: "أومو / شمش (اليوم / الشمس / النور)",
    meaningArabic: "الشمس، النور، اليوم، الأبيض، وإله العدل والضياء شمش.",
    meaningEnglish: "Sun, day, light, white, god Shamash.",
    periodOrigin: "قرص الشمس يشرق بين قمتي جبلين",
    wedgeAnatomy: {
      horizontal: 1,
      vertical: 1,
      winkelhaken: 1,
      description: "وتد زاوي في الوسط محاط بأوتاد ممتدة تجسد شروق أشعة الشمس."
    }
  },
  {
    id: "DUB",
    sign: "𒁾",
    borger: 138,
    labat: 138,
    sumerian: "DUB",
    akkadian: "ṭuppu",
    arabicName: "طُبّو (اللوح الطيني / السجل)",
    meaningArabic: "اللوح الطيني، السجل المكتوب، الوثيقة؛ ومنها اشتق لقب الكاتب (DUB-SAR / ṭupšarru كاتب الألواح).",
    meaningEnglish: "Clay tablet, inscribed record, document (origin of DUB-SAR 'scribe').",
    periodOrigin: "لوح مستطيل يحمل أسطراً كتابية",
    wedgeAnatomy: {
      horizontal: 2,
      vertical: 2,
      winkelhaken: 2,
      description: "إطار مستطيل يحوي بداخله مسامير منظمة تمثل الكتابة المحفورة."
    }
  }
];
