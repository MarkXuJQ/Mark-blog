import zh from '../languages/zh';
import en from '../languages/en';

const translations = { zh, en };

export function useTranslations(lang: 'zh' | 'en' = 'zh') {
  return function t(key: string) {
    const keys = key.split('.');
    let result: any = translations[lang];
    for (const k of keys) {
      if (result[k] === undefined) return key;
      result = result[k];
    }
    return result;
  };
}
