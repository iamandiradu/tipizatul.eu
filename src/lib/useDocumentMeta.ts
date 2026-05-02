import { useEffect } from 'react'

export interface DocumentMeta {
  title?: string
  description?: string
  canonical?: string
  noindex?: boolean
  // Mirrors {title, description, canonical} into og:* and twitter:* tags so
  // tab-share / preview targets pick them up. Real social crawlers read the
  // static HTML, so client-side updates only help browser UIs and any tools
  // that re-render after JS — but it costs nothing.
  ogImage?: string
}

const SITE_NAME = 'Tipizatul.eu'

function setMeta(selector: string, content: string, build: () => HTMLMetaElement) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = build()
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setNamedMeta(name: string, content: string) {
  setMeta(`meta[name="${name}"]`, content, () => {
    const el = document.createElement('meta')
    el.setAttribute('name', name)
    return el
  })
}

function setPropertyMeta(property: string, content: string) {
  setMeta(`meta[property="${property}"]`, content, () => {
    const el = document.createElement('meta')
    el.setAttribute('property', property)
    return el
  })
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function useDocumentMeta(meta: DocumentMeta) {
  useEffect(() => {
    if (meta.title) {
      const fullTitle = meta.title.includes(SITE_NAME) ? meta.title : `${meta.title} | ${SITE_NAME}`
      document.title = fullTitle
      setPropertyMeta('og:title', fullTitle)
      setNamedMeta('twitter:title', fullTitle)
    }
    if (meta.description) {
      setNamedMeta('description', meta.description)
      setPropertyMeta('og:description', meta.description)
      setNamedMeta('twitter:description', meta.description)
    }
    if (meta.canonical) {
      setCanonical(meta.canonical)
      setPropertyMeta('og:url', meta.canonical)
    }
    if (meta.ogImage) {
      setPropertyMeta('og:image', meta.ogImage)
      setNamedMeta('twitter:image', meta.ogImage)
    }
    if (meta.noindex !== undefined) {
      setNamedMeta('robots', meta.noindex ? 'noindex,nofollow' : 'index,follow')
    }
  }, [meta.title, meta.description, meta.canonical, meta.noindex, meta.ogImage])
}
