import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;

    // Apply font family based on language
    if (dir === 'rtl') {
      document.documentElement.style.fontFamily = "'Noto Sans Arabic', 'Cairo', system-ui, sans-serif";
    } else {
      document.documentElement.style.fontFamily = "'Inter', system-ui, sans-serif";
    }
  }, [i18n.language]);
}
