<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" indent="yes" />
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title><xsl:value-of select="atom:feed/atom:title" /></title>
        <link rel="icon" href="{atom:feed/atom:icon}" />
        <style type="text/css">
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; color: #1f2937; line-height: 1.6; margin: 0; background: #f8fafc; }
          .bg-fixed { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; background-image: url('/images/image1.jpg'); background-size: cover; background-position: center; background-repeat: no-repeat; }
          .overlay-fixed { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background-color: rgba(255, 255, 255, 0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); transition: background-color 0.5s; }
          .page { position: relative; z-index: 1; max-width: 860px; margin: 0 auto; padding: 2.5rem 1rem 3.5rem; }
          .logo-header { display: flex; gap: 1.25rem; align-items: center; background: #fff; padding: 2rem; border-radius: 18px; box-shadow: 0 12px 30px rgba(15,23,42,0.08); }
          .logo { width: 72px; height: 72px; border-radius: 16px; object-fit: cover; background: #e2e8f0; }
          .title { margin: 0 0 0.35rem 0; font-size: 2rem; font-weight: 800; color: #0f172a; }
          .subtitle { color: #475569; font-size: 1rem; }
          blockquote { margin: 1.5rem 0; padding: 1.25rem 1.5rem; background: #eef2ff; border-left: 4px solid #6366f1; border-radius: 12px; color: #3730a3; }
          blockquote p { margin: 0.25rem 0; }
          .description { color: #4338ca; font-size: 0.95rem; }
          main { display: grid; gap: 1.25rem; }
          .entry { display: grid; grid-template-columns: 140px 1fr; gap: 1.25rem; align-items: center; background: #fff; padding: 1.5rem; border-radius: 16px; text-decoration: none; color: inherit; box-shadow: 0 8px 22px rgba(15,23,42,0.06); transition: transform 0.2s, box-shadow 0.2s; }
          .entry:hover { transform: translateY(-2px); box-shadow: 0 16px 28px rgba(15,23,42,0.12); }
          .entry-image { width: 140px; height: 100px; border-radius: 12px; object-fit: cover; background: #e2e8f0; }
          .entry-title { margin: 0 0 0.5rem 0; font-size: 1.3rem; font-weight: 700; color: #0f172a; }
          .entry-summary { color: #475569; font-size: 0.98rem; margin-bottom: 0.6rem; }
          .entry-meta { color: #64748b; font-size: 0.85rem; }
          footer { margin-top: 2.5rem; text-align: center; color: #94a3b8; font-size: 0.85rem; }
          .entry-modal { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 20; }
          .entry-modal:target { opacity: 1; pointer-events: auto; }
          .modal-card { max-width: 720px; margin: 8vh auto; background: #fff; border-radius: 18px; box-shadow: 0 20px 50px rgba(15,23,42,0.2); padding: 2rem; position: relative; }
          .modal-cover { width: 100%; height: 280px; border-radius: 14px; object-fit: cover; background: #e2e8f0; margin-bottom: 1.25rem; }
          .modal-title { margin: 0 0 0.75rem 0; font-size: 1.6rem; font-weight: 800; color: #0f172a; }
          .modal-meta { color: #64748b; font-size: 0.9rem; margin-bottom: 0.9rem; display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
          .modal-meta span { display: inline-flex; align-items: center; gap: 0.35rem; }
          .modal-summary { color: #475569; font-size: 1rem; line-height: 1.7; }
          .modal-links { display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap; }
          .modal-button { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.65rem 1.1rem; border-radius: 9999px; text-decoration: none; font-size: 0.9rem; font-weight: 600; }
          .modal-primary { background: #0f172a; color: #fff; }
          .modal-secondary { background: #e2e8f0; color: #0f172a; }
          .modal-close { position: absolute; top: 0.75rem; right: 0.75rem; width: 36px; height: 36px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; text-decoration: none; background: #f1f5f9; color: #334155; font-size: 1.1rem; }
          @media (max-width: 640px) {
            .entry { grid-template-columns: 1fr; }
            .entry-image { width: 100%; height: 180px; }
            .modal-card { margin: 6vh 1rem; padding: 1.5rem; }
            .modal-cover { height: 200px; }
          }
        </style>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('time').forEach((time) => {
              const dateTime = new Date(time.dateTime)
              if (!Number.isNaN(dateTime.getTime())) {
                time.textContent = dateTime.toLocaleDateString()
                time.title = dateTime.toLocaleString(undefined, { timeZoneName: 'long' })
              }
            })
          })
        </script>
      </head>
      <body>
        <div class="bg-fixed"></div>
        <div class="overlay-fixed"></div>
        <div class="page">
          <header class="logo-header">
            <img class="logo" src="{atom:feed/atom:logo}" alt="" />
            <div>
              <h1 class="title"><xsl:value-of select="atom:feed/atom:title" /></h1>
              <div class="subtitle"><xsl:value-of select="atom:feed/atom:subtitle" /></div>
            </div>
          </header>
          <blockquote>
            <p>本页面是 Atom 订阅源，可直接被订阅。</p>
            <p class="description"><xsl:value-of select="atom:feed/atom:subtitle" /></p>
          </blockquote>
          <main>
            <xsl:apply-templates select="atom:feed/atom:entry" />
          </main>
          <footer>
            <xsl:value-of select="atom:feed/atom:rights" />
            <br />
            由 <xsl:value-of select="atom:feed/atom:generator" /> 生成
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="atom:entry">
    <xsl:variable name="entryLink">
      <xsl:choose>
        <xsl:when test="atom:link[@rel='alternate']">
          <xsl:value-of select="atom:link[@rel='alternate']/@href" />
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="atom:link/@href" />
        </xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="entryId" select="concat('entry-', generate-id())" />
    <xsl:variable name="img-src" select="substring-before(substring-after(substring-after(atom:content, '&lt;img'), 'src=&quot;'), '&quot;')" />
    <a href="#{$entryId}" class="entry">
      <xsl:if test="$img-src">
        <img class="entry-image" src="{$img-src}" alt="{atom:title}" loading="lazy" />
      </xsl:if>
      <article>
        <h2 class="entry-title">
          <xsl:value-of select="atom:title" />
        </h2>
        <xsl:if test="atom:summary">
          <div class="entry-summary">
            <xsl:value-of select="atom:summary" />
          </div>
        </xsl:if>
        <div class="entry-meta">
          发布于
          <time datetime="{atom:updated}">
            <xsl:value-of select="atom:updated" />
          </time>
          <xsl:if test="atom:category">
            ·
            <xsl:for-each select="atom:category">
              <xsl:value-of select="@term" />
            </xsl:for-each>
          </xsl:if>
        </div>
      </article>
    </a>
    <section class="entry-modal" id="{$entryId}">
      <div class="modal-card">
        <a class="modal-close" href="#">×</a>
        <xsl:choose>
          <xsl:when test="$img-src">
            <img class="modal-cover" src="{$img-src}" alt="{atom:title}" />
          </xsl:when>
          <xsl:otherwise>
            <img class="modal-cover" src="/images/image1.jpg" alt="" />
          </xsl:otherwise>
        </xsl:choose>
        <h3 class="modal-title">
          <xsl:value-of select="atom:title" />
        </h3>
        <div class="modal-meta">
          <span>作者：<xsl:value-of select="/atom:feed/atom:author/atom:name" /></span>
          <span>
            发布于
            <time datetime="{atom:updated}">
              <xsl:value-of select="atom:updated" />
            </time>
          </span>
        </div>
        <div class="modal-summary">
          <xsl:choose>
            <xsl:when test="atom:summary">
              <xsl:value-of select="atom:summary" />
            </xsl:when>
            <xsl:otherwise>
              <xsl:value-of select="atom:content" disable-output-escaping="yes" />
            </xsl:otherwise>
          </xsl:choose>
        </div>
        <div class="modal-links">
          <a class="modal-button modal-primary" href="{$entryLink}" target="_blank">阅读全文</a>
          <a class="modal-button modal-secondary" href="{/atom:feed/atom:link[@rel='alternate']/@href}" target="_blank">首页</a>
        </div>
      </div>
    </section>
  </xsl:template>
</xsl:stylesheet>
