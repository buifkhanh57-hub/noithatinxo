'use client'

/**
 * Floating contact buttons — Phone (call now) + Zalo (chat), bottom-left.
 * The client's reference (NT Anh Khoa) shows a red "Gọi Tư Vấn" + "Chat Zalo"
 * pair; this is the always-visible equivalent on our storefront.
 * Bottom-RIGHT is occupied by the AVH chat widget, so these sit bottom-left.
 * Hidden on the admin view.
 */

import { Phone, MessageCircle } from 'lucide-react'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { useUIStore } from '@/lib/stores/ui-store'
import { useMounted } from '@/hooks/use-mounted'

function zaloLink(zalo: string): string {
  if (!zalo) return ''
  if (zalo.startsWith('http')) return zalo
  return `https://zalo.me/${zalo.replace(/\D/g, '')}`
}

export function FloatingContact() {
  const mounted = useMounted()
  const view = useUIStore((s) => s.view)
  const settings = useSettingsStore()
  const hotline = settings.get('contact_hotline')
  const zalo = settings.get('social_zalo')

  if (!mounted || view === 'admin') return null

  return (
    <div className="fixed bottom-4 left-3 z-50 flex flex-col gap-2 sm:bottom-6 sm:left-5 print:hidden">
      <a
        href={`tel:${(hotline || '').replace(/\s/g, '')}`}
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:bg-primary/90 sm:h-13 sm:w-13"
        aria-label={`Gọi tư vấn ${hotline}`}
        title={`Gọi tư vấn ${hotline}`}
      >
        <Phone className="h-5 w-5" />
        <span className="avh-pulse absolute inset-0 -z-10 rounded-full bg-primary/40" />
      </a>
      {zalo && (
        <a
          href={zaloLink(zalo)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0180c7] text-white shadow-lg transition hover:scale-105 hover:bg-[#0270ae]"
          aria-label="Chat Zalo"
          title="Chat Zalo"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      )}
    </div>
  )
}
