import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zh from './languages/zh.json'
import en from './languages/en.json'

// 资源文件
const resources = {
  zh: {
    translation: zh,
  },
  en: {
    translation: en,
  },
}

i18n
  // 自动检测浏览器语言
  .use(LanguageDetector)
  // 注入 react-i18next
  .use(initReactI18next)
  // 初始化
  .init({
    resources,
    // 默认语言（如果检测失败）
    fallbackLng: 'zh',
    // 调试模式，开发时可以设为 true
    debug: false,
    
    interpolation: {
      // React 已经内置了 XSS 防护，所以这里不需要转义
      escapeValue: false, 
    },
  })

export default i18n
