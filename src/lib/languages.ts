export const SAME_AS_INTERFACE_LANGUAGE = "same_as_interface";

export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel?: string;
  regionHint?: string;
}

export const INTERFACE_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "ru", label: "Русский", nativeLabel: "Русский", regionHint: "RU/CIS" },
  { code: "en", label: "English", nativeLabel: "English", regionHint: "Global" },
  { code: "es", label: "Spanish", nativeLabel: "Español", regionHint: "LATAM" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", regionHint: "BR/PT" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", regionHint: "TR" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", regionHint: "MENA" },
  { code: "fa", label: "Persian", nativeLabel: "فارسی", regionHint: "IR" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia", regionHint: "ID" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", regionHint: "IN" },
  { code: "uk", label: "Ukrainian", nativeLabel: "Українська", regionHint: "UA" },
  { code: "uz", label: "Uzbek", nativeLabel: "O'zbekcha", regionHint: "UZ" },
  { code: "de", label: "German", nativeLabel: "Deutsch", regionHint: "DACH" }
];

export const INTERPRETATION_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: SAME_AS_INTERFACE_LANGUAGE, label: "Как язык интерфейса", nativeLabel: "Автоматически" },
  { code: "af", label: "Afrikaans", nativeLabel: "Afrikaans" },
  { code: "sq", label: "Albanian", nativeLabel: "Shqip" },
  { code: "am", label: "Amharic", nativeLabel: "አማርኛ" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "hy", label: "Armenian", nativeLabel: "Հայերեն" },
  { code: "az", label: "Azerbaijani", nativeLabel: "Azərbaycanca" },
  { code: "eu", label: "Basque", nativeLabel: "Euskara" },
  { code: "be", label: "Belarusian", nativeLabel: "Беларуская" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "bs", label: "Bosnian", nativeLabel: "Bosanski" },
  { code: "bg", label: "Bulgarian", nativeLabel: "Български" },
  { code: "ca", label: "Catalan", nativeLabel: "Català" },
  { code: "ceb", label: "Cebuano", nativeLabel: "Cebuano" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "hr", label: "Croatian", nativeLabel: "Hrvatski" },
  { code: "cs", label: "Czech", nativeLabel: "Čeština" },
  { code: "da", label: "Danish", nativeLabel: "Dansk" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "eo", label: "Esperanto", nativeLabel: "Esperanto" },
  { code: "et", label: "Estonian", nativeLabel: "Eesti" },
  { code: "fi", label: "Finnish", nativeLabel: "Suomi" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "gl", label: "Galician", nativeLabel: "Galego" },
  { code: "ka", label: "Georgian", nativeLabel: "ქართული" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "el", label: "Greek", nativeLabel: "Ελληνικά" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { code: "ht", label: "Haitian Creole", nativeLabel: "Kreyòl ayisyen" },
  { code: "ha", label: "Hausa", nativeLabel: "Hausa" },
  { code: "he", label: "Hebrew", nativeLabel: "עברית" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "hu", label: "Hungarian", nativeLabel: "Magyar" },
  { code: "is", label: "Icelandic", nativeLabel: "Íslenska" },
  { code: "ig", label: "Igbo", nativeLabel: "Igbo" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia" },
  { code: "ga", label: "Irish", nativeLabel: "Gaeilge" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "jv", label: "Javanese", nativeLabel: "Basa Jawa" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "kk", label: "Kazakh", nativeLabel: "Қазақша" },
  { code: "km", label: "Khmer", nativeLabel: "ភាសាខ្មែរ" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "ku", label: "Kurdish", nativeLabel: "Kurdî" },
  { code: "ky", label: "Kyrgyz", nativeLabel: "Кыргызча" },
  { code: "lo", label: "Lao", nativeLabel: "ລາວ" },
  { code: "la", label: "Latin", nativeLabel: "Latina" },
  { code: "lv", label: "Latvian", nativeLabel: "Latviešu" },
  { code: "lt", label: "Lithuanian", nativeLabel: "Lietuvių" },
  { code: "lb", label: "Luxembourgish", nativeLabel: "Lëtzebuergesch" },
  { code: "mk", label: "Macedonian", nativeLabel: "Македонски" },
  { code: "mg", label: "Malagasy", nativeLabel: "Malagasy" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം" },
  { code: "mt", label: "Maltese", nativeLabel: "Malti" },
  { code: "mi", label: "Maori", nativeLabel: "Māori" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "mn", label: "Mongolian", nativeLabel: "Монгол" },
  { code: "my", label: "Myanmar", nativeLabel: "မြန်မာ" },
  { code: "ne", label: "Nepali", nativeLabel: "नेपाली" },
  { code: "no", label: "Norwegian", nativeLabel: "Norsk" },
  { code: "or", label: "Odia", nativeLabel: "ଓଡ଼ିଆ" },
  { code: "ps", label: "Pashto", nativeLabel: "پښتو" },
  { code: "fa", label: "Persian", nativeLabel: "فارسی" },
  { code: "pl", label: "Polish", nativeLabel: "Polski" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
  { code: "ro", label: "Romanian", nativeLabel: "Română" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "sr", label: "Serbian", nativeLabel: "Српски" },
  { code: "si", label: "Sinhala", nativeLabel: "සිංහල" },
  { code: "sk", label: "Slovak", nativeLabel: "Slovenčina" },
  { code: "sl", label: "Slovenian", nativeLabel: "Slovenščina" },
  { code: "so", label: "Somali", nativeLabel: "Soomaali" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "su", label: "Sundanese", nativeLabel: "Basa Sunda" },
  { code: "sw", label: "Swahili", nativeLabel: "Kiswahili" },
  { code: "sv", label: "Swedish", nativeLabel: "Svenska" },
  { code: "tl", label: "Tagalog", nativeLabel: "Tagalog" },
  { code: "tg", label: "Tajik", nativeLabel: "Тоҷикӣ" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "tt", label: "Tatar", nativeLabel: "Татарча" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "th", label: "Thai", nativeLabel: "ไทย" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { code: "tk", label: "Turkmen", nativeLabel: "Türkmençe" },
  { code: "uk", label: "Ukrainian", nativeLabel: "Українська" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو" },
  { code: "ug", label: "Uyghur", nativeLabel: "ئۇيغۇرچە" },
  { code: "uz", label: "Uzbek", nativeLabel: "O'zbekcha" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { code: "cy", label: "Welsh", nativeLabel: "Cymraeg" },
  { code: "xh", label: "Xhosa", nativeLabel: "isiXhosa" },
  { code: "yi", label: "Yiddish", nativeLabel: "ייִדיש" },
  { code: "yo", label: "Yoruba", nativeLabel: "Yorùbá" },
  { code: "zu", label: "Zulu", nativeLabel: "isiZulu" }
];

export function normalizeLanguageCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (trimmed === SAME_AS_INTERFACE_LANGUAGE) return SAME_AS_INTERFACE_LANGUAGE;
  return trimmed.toLowerCase().replace(/_/g, "-").split("-")[0] || null;
}

export function mapToSupportedInterfaceLanguage(code: string | null | undefined): string {
  const normalized = normalizeLanguageCode(code);
  if (normalized && INTERFACE_LANGUAGE_OPTIONS.some((option) => option.code === normalized)) {
    return normalized;
  }
  return "en";
}

export function getInterfaceLanguageLabel(code: string | null | undefined): string {
  const normalized = normalizeLanguageCode(code);
  if (!normalized) return "Не выбрано";
  const option = INTERFACE_LANGUAGE_OPTIONS.find((item) => item.code === normalized);
  return option?.nativeLabel || option?.label || normalized;
}

export function getInterpretationLanguageLabel(
  code: string | null | undefined,
  interfaceLanguage?: string | null
): string {
  const normalized = normalizeLanguageCode(code) || SAME_AS_INTERFACE_LANGUAGE;
  if (normalized === SAME_AS_INTERFACE_LANGUAGE) {
    return `Как интерфейс (${getInterfaceLanguageLabel(interfaceLanguage)})`;
  }
  const option = INTERPRETATION_LANGUAGE_OPTIONS.find((item) => item.code === normalized);
  return option ? `${option.nativeLabel || option.label}` : normalized;
}

export function resolveInterpretationLanguage(
  interpretationLanguage: string | null | undefined,
  interfaceLanguage: string | null | undefined,
  fallback: string | null | undefined
): string {
  const normalizedInterpretation = normalizeLanguageCode(interpretationLanguage);
  if (normalizedInterpretation && normalizedInterpretation !== SAME_AS_INTERFACE_LANGUAGE) {
    return normalizedInterpretation;
  }
  return normalizeLanguageCode(interfaceLanguage) || normalizeLanguageCode(fallback) || "ru";
}
