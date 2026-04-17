'use client'

import { ExternalLink } from 'lucide-react'
import { HoverPeek } from '@/components/ui/link-preview'

const UNSPLASH_PREVIEW =
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80'

export function HoverPeekDemoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-950">
      <p className="text-lg text-gray-800 dark:text-slate-100">
        Hover link for preview:{' '}
        <HoverPeek
          url="https://21st.dev/?tab=home"
          isStatic
          imageSrc={UNSPLASH_PREVIEW}
        >
          <a
            href="https://21st.dev/?tab=home"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-blue-600 underline decoration-blue-400 decoration-dotted underline-offset-4 transition-colors hover:text-blue-800 hover:decoration-blue-600 hover:decoration-solid"
          >
            <span>21st.dev</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </HoverPeek>
      </p>
    </div>
  )
}
