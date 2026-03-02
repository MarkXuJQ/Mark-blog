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
          :root {
            --bg-color: #f8fafc;
            --text-color: #1f2937;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --card-bg: #ffffff;
            --header-bg: #ffffff;
            --logo-bg: #e2e8f0;
            --blockquote-bg: #eef2ff;
            --blockquote-border: #6366f1;
            --blockquote-text: #3730a3;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --bg-image: url('/images/day.png');
            --overlay-color: rgba(255, 255, 255, 0.6);
            --title-color: #0f172a;
          }

          @media (prefers-color-scheme: dark) {
            :root {
              --bg-color: #0f172a;
              --text-color: #f1f5f9;
              --text-secondary: #cbd5e1;
              --text-muted: #94a3b8;
              --card-bg: #1e293b;
              --header-bg: #1e293b;
              --logo-bg: #334155;
              --blockquote-bg: #1e1b4b;
              --blockquote-border: #818cf8;
              --blockquote-text: #e0e7ff;
              --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
              --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
              --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
              --bg-image: url('/images/night.png');
              --overlay-color: rgba(0, 0, 0, 0.6);
              --title-color: #f8fafc;
            }
          }

          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; color: var(--text-color); line-height: 1.6; margin: 0; background: var(--bg-color); }
          .bg-fixed { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; background-image: var(--bg-image); background-size: cover; background-position: center; background-repeat: no-repeat; transition: background-image 0.5s ease-in-out; }
          .overlay-fixed { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background-color: var(--overlay-color); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); transition: background-color 0.5s; }
          .page { position: relative; z-index: 1; max-width: 860px; margin: 0 auto; padding: 2.5rem 1rem 3.5rem; }
          
          .logo-header { display: flex; justify-content: space-between; align-items: center; background: var(--header-bg); padding: 2rem; border-radius: 18px; box-shadow: var(--shadow-lg); }
          .header-content { display: flex; gap: 1.25rem; align-items: center; }
          
          .back-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: var(--blockquote-bg); color: var(--blockquote-text); border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; }
          .back-btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
          
          .logo { width: 72px; height: 72px; border-radius: 16px; object-fit: cover; background: var(--logo-bg); }
          .title { margin: 0 0 0.35rem 0; font-size: 2rem; font-weight: 800; color: var(--title-color); }
          .subtitle { color: var(--text-secondary); font-size: 1rem; }
          
          blockquote { margin: 1.5rem 0; padding: 1.25rem 1.5rem; background: var(--blockquote-bg); border-left: 4px solid var(--blockquote-border); border-radius: 12px; color: var(--blockquote-text); }
          blockquote p { margin: 0.25rem 0; }
          .description { color: var(--blockquote-text); font-size: 0.95rem; opacity: 0.9; }
          
          main { display: grid; gap: 1.25rem; }
          .entry { display: grid; grid-template-columns: 140px 1fr; gap: 1.25rem; align-items: center; background: var(--card-bg); padding: 1.5rem; border-radius: 16px; text-decoration: none; color: inherit; box-shadow: var(--shadow-md); transition: transform 0.2s, box-shadow 0.2s; }
          .entry:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
          .entry-image { width: 140px; height: 100px; border-radius: 12px; object-fit: cover; background: var(--logo-bg); }
          .entry-title { margin: 0 0 0.5rem 0; font-size: 1.3rem; font-weight: 700; color: var(--title-color); }
          .entry-summary { color: var(--text-secondary); font-size: 0.98rem; margin-bottom: 0.6rem; }
          .entry-meta { color: var(--text-muted); font-size: 0.85rem; }
          
          footer { margin-top: 2.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; }
          
          .entry-modal { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 20; backdrop-filter: blur(4px); }
          .entry-modal:target { opacity: 1; pointer-events: auto; }
          .modal-card { max-width: 720px; margin: 8vh auto; background: var(--card-bg); border-radius: 18px; box-shadow: var(--shadow-lg); padding: 2rem; position: relative; color: var(--text-color); }
          .modal-cover { width: 100%; height: 280px; border-radius: 14px; object-fit: cover; background: var(--logo-bg); margin-bottom: 1.25rem; }
           .modal-cover.default { object-fit: unset; background-image: var(--bg-image); background-size: cover; background-position: center; }
          .modal-title { margin: 0 0 0.75rem 0; font-size: 1.6rem; font-weight: 800; color: var(--title-color); }
          .modal-meta { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.9rem; display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
          .modal-meta span { display: inline-flex; align-items: center; gap: 0.35rem; }
          .modal-summary { color: var(--text-secondary); font-size: 1rem; line-height: 1.7; }
          .modal-links { display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap; }
          .modal-button { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.65rem 1.1rem; border-radius: 9999px; text-decoration: none; font-size: 0.9rem; font-weight: 600; }
          .modal-primary { background: var(--title-color); color: var(--card-bg); }
          .modal-secondary { background: var(--logo-bg); color: var(--title-color); }
          .modal-close { position: absolute; top: 0.75rem; right: 0.75rem; width: 36px; height: 36px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; text-decoration: none; background: var(--logo-bg); color: var(--text-muted); font-size: 1.1rem; }
          
          @media (max-width: 640px) {
            .logo-header { flex-direction: column; gap: 1rem; text-align: center; }
            .header-content { flex-direction: column; }
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
            <div class="header-content">
              <img class="logo" src="{atom:feed/atom:logo}" alt="" />
              <div>
                <h1 class="title"><xsl:value-of select="atom:feed/atom:title" /></h1>
                <div class="subtitle"><xsl:value-of select="atom:feed/atom:subtitle" /></div>
              </div>
            </div>
            <a href="/" class="back-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              返回主页
            </a>
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
            <div class="modal-cover default"></div>
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
