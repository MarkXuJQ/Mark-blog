import { useEffect, useRef, useState } from 'react'
// import Tippy from '@tippyjs/react'
// import 'tippy.js/dist/tippy.css' // optional
import { useTranslation } from 'react-i18next'
import { Card } from './Card'
import { cn } from '../utils/cn'
import { CornerUpLeft, ExternalLink } from 'lucide-react'

// Declare Twikoo on window
declare global {
  interface Window {
    twikoo: any
  }
}

export function Comments() {
  const { t } = useTranslation()
  const commentRef = useRef<HTMLDivElement>(null)
  const [popoverVisible, setPopoverVisible] = useState(false)
  const [popoverJumpTo, setPopoverJumpTo] = useState('')
  const [popoverInput, setPopoverInput] = useState('')
  const [showUndo, setShowUndo] = useState(false)
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null)
  
  // Twikoo Environment ID
  // 1. 如果你有腾讯云开发环境 ID，请直接填入，例如：'your-env-id'
  // 2. 如果你有私有部署地址（Vercel/Zeabur/Docker等），请填入完整地址（不带末尾斜杠）
  //    注意：Vercel 默认域名 (*.vercel.app) 在国内被墙，必须绑定自定义域名才能访问！
  //    例如：'https://comments.yourdomain.com'
  // 3. 这里暂时留空或使用示例，请务必替换为你自己的！
  const TWIKOO_ENV_ID = import.meta.env.VITE_TWIKOO_ENV_ID || 'https://blog-comments-pearl-theta.vercel.app/' 

  // Initialize Twikoo
  useEffect(() => {
    // 如果没有配置 ID，显示提示
    if (!TWIKOO_ENV_ID) return

    // 定义加载完成后的回调
    const loadSecondScript = () => {
      try {
        if (window.twikoo) {
          window.twikoo.init({
            envId: TWIKOO_ENV_ID,
            el: '#twikoo',
          })
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
        // 脚本存在但全局对象未就绪（可能还在加载中），添加监听
        existingScript.addEventListener('load', loadSecondScript)
        
        // 清理监听（仅针对这种情况）
        return () => {
          existingScript.removeEventListener('load', loadSecondScript)
        }
      }
    } else {
      // 脚本不存在，创建并插入
      const cdnScript = document.createElement('script')
      cdnScript.src = 'https://cdn.staticfile.org/twikoo/1.6.39/twikoo.all.min.js'
      cdnScript.async = true
      cdnScript.id = 'twikoo-script'
      
      cdnScript.addEventListener('load', loadSecondScript)
      document.body.appendChild(cdnScript)

      return () => {
        cdnScript.removeEventListener('load', loadSecondScript)
      }
    }
  }, [TWIKOO_ENV_ID])

  // Link Guard Logic
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return

      // Skip avatar clicks if needed (based on original code)
      if (e.target.matches('.tk-avatar-img')) {
        e.stopPropagation()
        return
      }

      const targetLink = e.target.closest('a[target="_blank"]')
      if (!(targetLink instanceof HTMLAnchorElement)) return

      // Only intercept links inside the comment section
      if (!commentRef.current?.contains(targetLink)) return

      e.preventDefault()
      e.stopPropagation()

      const href = targetLink.href
      const decodedHref = decodeURIComponent(href)
      
      setPopoverJumpTo(decodedHref)
      setPopoverInput(decodedHref)
      setReferenceElement(targetLink)
      setPopoverVisible(true)
      setShowUndo(false)
    }

    // Attach listener to the comment section or document
    // Using document capture phase to ensure we catch it before navigation
    const commentEl = commentRef.current
    if (commentEl) {
      commentEl.addEventListener('click', handleLinkClick, { capture: true })
    }

    return () => {
      if (commentEl) {
        commentEl.removeEventListener('click', handleLinkClick, { capture: true })
      }
    }
  }, [])

  const handleInputChange = (e: React.FormEvent<HTMLSpanElement>) => {
    const newVal = e.currentTarget.textContent || ''
    setPopoverInput(newVal)
    setShowUndo(newVal !== popoverJumpTo)
  }

  const handleUndo = () => {
    setPopoverInput(popoverJumpTo)
    setShowUndo(false)
    // We need to update the content editable text manually
    const inputEl = document.getElementById('popover-input')
    if (inputEl) {
      inputEl.textContent = popoverJumpTo
    }
  }

  const confirmOpen = () => {
    if (popoverInput) {
      window.open(popoverInput, '_blank')
      setPopoverVisible(false)
    }
  }

  return (
    <section ref={commentRef} className="mt-12 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {t('comments.title', '评论区')}
        </h3>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
      </div>

      {/* Popover for Link Guard */}
      {/* {referenceElement && (
        <Tippy
          visible={popoverVisible}
          onClickOutside={() => setPopoverVisible(false)}
          interactive={true}
          reference={referenceElement}
          placement="top"
          appendTo={document.body}
          render={attrs => (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-1 flex items-stretch overflow-hidden animate-in fade-in zoom-in-95 duration-200" {...attrs}>
              <span
                id="popover-input"
                key={popoverJumpTo} // Re-render when target changes to reset content
                className="min-w-[200px] max-w-[300px] px-3 py-1.5 text-sm outline-none break-all text-slate-600 dark:text-slate-300 font-mono"
                contentEditable="plaintext-only"
                suppressContentEditableWarning
                spellCheck={false}
                onInput={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmOpen()
                  }
                }}
              >
                {popoverJumpTo}
              </span>

              {showUndo && (
                <button
                  className="px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors border-l border-slate-100 dark:border-slate-700"
                  onClick={handleUndo}
                  title="恢复链接"
                >
                  <CornerUpLeft size={16} />
                </button>
              )}

              <button
                className="px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1 rounded-r"
                onClick={confirmOpen}
              >
                <span>访问</span>
                <ExternalLink size={12} />
              </button>
            </div>
          )}
        >
          <span /> 
        </Tippy>
      )} */}

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
