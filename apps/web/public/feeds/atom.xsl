<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  <xsl:template match="/">
    <xsl:variable name="isEnglish" select="contains(atom:feed/atom:link[@rel='self']/@href, '/en/')" />
    <xsl:variable name="atomUrl" select="atom:feed/atom:link[@rel='self']/@href" />
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
        <title><xsl:value-of select="atom:feed/atom:title" /> - RSS Feed</title>
        <link rel="icon" href="{atom:feed/atom:icon}" />
        <style>
          :root { --bg:#f8fafc; --card:#fff; --text:#1e293b; --sub:#64748b; --accent:#3b82f6; --border:#e2e8f0; --overlay:rgba(255,255,255,.4); }
          @media (prefers-color-scheme:dark) { :root { --bg:#0f172a; --card:#1e293b; --text:#f1f5f9; --sub:#94a3b8; --accent:#60a5fa; --border:#334155; --overlay:rgba(0,0,0,.5); } }
          * { box-sizing:border-box; } body { position:relative; margin:0; min-height:100vh; padding:2rem 1rem; color:var(--text); background:var(--bg) url('/images/day.png') center/cover fixed no-repeat; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; }
          @media (prefers-color-scheme:dark) { body { background-image:url('/images/night.png'); } } body::before { content:""; position:fixed; inset:0; z-index:0; background:var(--overlay); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
          .page { position:relative; z-index:1; max-width:800px; margin:0 auto; } header { margin-bottom:3rem; padding:2rem; text-align:center; background:var(--card); border:1px solid var(--border); border-radius:16px; box-shadow:0 4px 6px -1px rgba(0,0,0,.1); }
          .header-actions { display:flex; justify-content:center; margin-bottom:1rem; } .back-button { padding:.45rem .9rem; border:1px solid var(--border); border-radius:999px; background:var(--bg); color:var(--text); text-decoration:none; font-size:.85rem; font-weight:600; }
          .lang-toggle { display:inline-flex; gap:.4rem; padding:.25rem; border:1px solid var(--border); border-radius:999px; background:var(--bg); } .lang-toggle a { min-width:2.75rem; padding:.35rem .8rem; border-radius:999px; color:var(--sub); text-decoration:none; font-size:.8rem; font-weight:700; } .lang-toggle a.active { color:var(--text); background:var(--card); box-shadow:0 4px 10px rgba(0,0,0,.08); }
          h1 { margin:0 0 .5rem; font-size:2rem; } .desc { margin-bottom:1.5rem; color:var(--sub); } .subscribe-box { display:inline-flex; flex-direction:column; gap:.5rem; padding:1rem; border:1px solid var(--border); border-radius:8px; background:var(--bg); font-size:.95rem; } .copy-area { padding:.5rem 1rem; overflow-wrap:anywhere; border:1px solid var(--border); border-radius:6px; background:var(--card); font-family:monospace; user-select:all; }
          main { display:grid; gap:1.25rem; } .card { display:flex; flex-direction:column; overflow:hidden; margin:0; border:1px solid var(--border); border-radius:12px; background:var(--card); box-shadow:0 4px 6px -1px rgba(0,0,0,.1); transition:transform .2s; } .card:hover { transform:translateY(-2px); }
          .cover { width:100%; height:140px; object-fit:cover; background:var(--border); } .body { padding:1rem; } h2 { margin:0 0 .4rem; font-size:1.05rem; } .summary { display:-webkit-box; overflow:hidden; margin:0 0 .8rem; color:var(--sub); font-size:.85rem; -webkit-box-orient:vertical; -webkit-line-clamp:2; } .meta { display:flex; justify-content:space-between; align-items:center; gap:.75rem; color:var(--sub); font-size:.75rem; } .meta a { color:var(--accent); text-decoration:none; font-weight:500; } footer { margin-top:2.5rem; color:var(--sub); text-align:center; font-size:.85rem; }
          @media (min-width:640px) { .card { flex-direction:row; height:150px; } .cover { width:180px; height:100%; } .body { flex:1; display:flex; flex-direction:column; } .summary { flex:1; } }
        </style>
      </head>
      <body><div class="page"><header>
        <div class="header-actions"><a class="back-button" href="https://markxu.icu"><xsl:choose><xsl:when test="$isEnglish">← Back to Home</xsl:when><xsl:otherwise>← 返回主页</xsl:otherwise></xsl:choose></a></div>
        <div class="header-actions"><div class="lang-toggle" role="tablist" aria-label="Language"><a href="https://markxu.icu/feeds/zh/" role="tab"><xsl:if test="not($isEnglish)"><xsl:attribute name="class">active</xsl:attribute></xsl:if>中文</a><a href="https://markxu.icu/feeds/en/" role="tab"><xsl:if test="$isEnglish"><xsl:attribute name="class">active</xsl:attribute></xsl:if>EN</a></div></div>
        <h1><xsl:value-of select="atom:feed/atom:title" /></h1><div class="desc"><xsl:value-of select="atom:feed/atom:subtitle" /></div>
        <div class="subscribe-box"><span><xsl:choose><xsl:when test="$isEnglish">👇 Copy the link below into your RSS reader:</xsl:when><xsl:otherwise>👇 复制下面的链接到您的 RSS 阅读器中订阅：</xsl:otherwise></xsl:choose></span><div class="copy-area"><xsl:value-of select="$atomUrl" /></div></div>
      </header><main><xsl:apply-templates select="atom:feed/atom:entry" /></main><footer><xsl:value-of select="atom:feed/atom:rights" /><br /><xsl:choose><xsl:when test="$isEnglish">Generated by </xsl:when><xsl:otherwise>由 </xsl:otherwise></xsl:choose><xsl:value-of select="atom:feed/atom:generator" /></footer></div></body>
    </html>
  </xsl:template>
  <xsl:template match="atom:entry">
    <xsl:variable name="entryLink" select="atom:link[not(@rel) or @rel='alternate'][1]/@href" />
    <xsl:variable name="imgSrc" select="substring-before(substring-after(substring-after(atom:content, '&lt;img'), 'src=&quot;'), '&quot;')" />
    <article class="card"><xsl:if test="$imgSrc"><img class="cover" src="{$imgSrc}" alt="{atom:title}" loading="lazy" /></xsl:if><div class="body"><h2><xsl:value-of select="atom:title" /></h2><p class="summary"><xsl:value-of select="atom:summary" /></p><div class="meta"><time datetime="{atom:updated}"><xsl:value-of select="substring(atom:updated, 1, 10)" /></time><a href="{$entryLink}" target="_blank" rel="noopener noreferrer"><xsl:choose><xsl:when test="contains(/atom:feed/atom:link[@rel='self']/@href, '/en/')">Read full article</xsl:when><xsl:otherwise>阅读全文</xsl:otherwise></xsl:choose></a></div></div></article>
  </xsl:template>
</xsl:stylesheet>
