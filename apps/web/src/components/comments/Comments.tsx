import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LinkGuard } from './LinkGuard'

interface TwikooStatic {
  init: (options: { envId: string; el: string }) => void
}

// Declare Twikoo on window
declare global {
  interface Window {
    twikoo: TwikooStatic
  }
}

export function Comments() {
  const { t } = useTranslation()
  const commentRef = useRef<HTMLElement>(null)
  
  // Twikoo Environment ID
  // 1. 如果你有腾讯云开发环境 ID，请直接填入，例如：'your-env-id'
  // 2. 如果你有私有部署地址（Vercel/Zeabur/Docker等），请填入完整地址（不带末尾斜杠）
  //    注意：Vercel 默认域名 (*.vercel.app) 在国内被墙，必须绑定自定义域名才能访问！
  //    例如：'https://comments.yourdomain.com'
  // 3. 这里暂时留空或使用示例，请务必替换为你自己的！
  // 确保指向云函数路径（/api），避免请求根路径（/）导致的 405
  const TWIKOO_ENV_ID = import.meta.env.VITE_TWIKOO_ENV_ID || 'https://comments.markxu.icu/api/twikoo' 

  // Initialize Twikoo
  useEffect(() => {
    // 如果没有配置 ID，显示提示
    if (!TWIKOO_ENV_ID) return

    // 定义加载完成后的回调
    const loadSecondScript = () => {
      try {
        if (window.twikoo && typeof window.twikoo.init === 'function') {
          window.twikoo.init({
            envId: TWIKOO_ENV_ID,
            el: '#twikoo',
          })
        } else {
          // Retry if not ready yet
          setTimeout(loadSecondScript, 500)
        }
      } catch (e) {
        console.error('Twikoo init error:', e)
      }
    }

    // 检查是否已经加载过
    const existingScript = document.getElementById('twikoo-script') as HTMLScriptElement
    
    if (existingScript) {
      // 如果脚本已存在
      if (window.twikoo) {
        // 全局对象已就绪，直接初始化
        loadSecondScript()
      } else {
        // 脚本存在但全局对象未就绪，添加监听，同时增加轮询兜底
        existingScript.addEventListener('load', loadSecondScript)
        
        const intervalId = setInterval(() => {
          if (window.twikoo) {
            loadSecondScript()
            clearInterval(intervalId)
          }
        }, 500)
        
        return () => {
          existingScript.removeEventListener('load', loadSecondScript)
          clearInterval(intervalId)
        }
      }
    } else {
      // 脚本不存在，创建并插入
      const cdnScript = document.createElement('script')
      cdnScript.src = 'https://registry.npmmirror.com/twikoo/1.7.0/files/dist/twikoo.min.js'
      cdnScript.async = true
      cdnScript.id = 'twikoo-script'
      cdnScript.crossOrigin = 'anonymous'
      
      cdnScript.addEventListener('load', loadSecondScript)
      document.body.appendChild(cdnScript)

      return () => {
        cdnScript.removeEventListener('load', loadSecondScript)
      }
    }
  }, [TWIKOO_ENV_ID])

  return (
    <section ref={commentRef} className="mt-12 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {t('comments.title', '评论区')}
        </h3>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
      </div>

      {/* Popover for Link Guard */}
      <LinkGuard containerRef={commentRef} />

      {/* Twikoo Container */}
      <div id="twikoo" className="twikoo-container">
        {!TWIKOO_ENV_ID ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 mx-4">
            <p className="mb-2 font-medium">评论区未配置</p>
            <p className="text-sm text-center max-w-md px-4">
              请在 <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">.env</code> 文件中配置 <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">VITE_TWIKOO_ENV_ID</code>，
              或者在 <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">src/components/Comments.tsx</code> 中直接填入您的 Twikoo 环境 ID。
            </p>
          </div>
        ) : (
          <div className="flex justify-center py-8 text-slate-400 text-sm">
            评论加载中...
          </div>
        )}
      </div>

      <style>{`
        /* Custom styles to match the blog theme */
        .twikoo-container .tk-admin-container {
            z-index: 100;
        }
        .twikoo-container .tk-input {
            background-color: transparent !important;
        }
        .twikoo-container .tk-meta-input {
            background-color: transparent !important;
        }
        
        /* Dark mode adaptations for Twikoo */
        .dark .twikoo-container .tk-content {
            color: #cbd5e1;
        }
        .dark .twikoo-container .tk-time,
        .dark .twikoo-container .tk-extras {
            color: #94a3b8;
        }
        .dark .twikoo-container .tk-nick {
            color: #e2e8f0;
        }
        .dark .twikoo-container .tk-input textarea {
            color: #e2e8f0;
            background-color: #1e293b;
        }
        .dark .twikoo-container .tk-meta-input input {
            color: #e2e8f0;
        }
        .dark .twikoo-container .tk-action-icon {
            color: #94a3b8;
        }
        .dark .twikoo-container .tk-submit-action-icon {
            color: #94a3b8;
        }
      `}</style>
    </section>
  )
}
