<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> RSS Feed</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
        <style type="text/css">
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; color: #333; line-height: 1.5; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; background-color: #fff; min-height: 100vh; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
          header { border-bottom: 1px solid #eaeaea; padding-bottom: 1.5rem; margin-bottom: 2rem; }
          h1 { margin: 0 0 0.5rem 0; font-size: 1.8rem; font-weight: 700; color: #111; }
          p.desc { color: #666; margin: 0; font-size: 1rem; }
          .meta { font-size: 0.875rem; color: #888; margin-top: 0.5rem; }
          .meta a { color: #0070f3; text-decoration: none; }
          .meta a:hover { text-decoration: underline; }
          .item { margin-bottom: 2.5rem; padding-bottom: 2.5rem; border-bottom: 1px solid #eaeaea; }
          .item:last-child { border-bottom: none; }
          .item h3 { margin: 0 0 0.5rem 0; font-size: 1.4rem; }
          .item h3 a { color: #111; text-decoration: none; transition: color 0.2s; }
          .item h3 a:hover { color: #0070f3; }
          .item-meta { font-size: 0.875rem; color: #888; margin-bottom: 1rem; }
          .item-desc { color: #444; font-size: 1rem; line-height: 1.6; }
          .notice { background-color: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; padding: 1rem; border-radius: 0.5rem; margin-bottom: 2rem; font-size: 0.9rem; }
          @media (prefers-color-scheme: dark) {
            body { background-color: #111; color: #eee; }
            .container { background-color: #000; box-shadow: none; }
            header { border-bottom-color: #333; }
            h1 { color: #fff; }
            p.desc { color: #aaa; }
            .item { border-bottom-color: #333; }
            .item h3 a { color: #fff; }
            .item h3 a:hover { color: #3b82f6; }
            .item-meta { color: #777; }
            .item-desc { color: #ccc; }
            .notice { background-color: #1e1b4b; border-color: #312e81; color: #c7d2fe; }
            .meta a { color: #3b82f6; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="notice">
            <strong>RSS Feed Preview</strong>
            <br/>
            This is a web preview of the RSS feed. To subscribe, copy the URL from your browser's address bar and paste it into your RSS reader.
          </div>
          <header>
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p class="desc"><xsl:value-of select="/rss/channel/description"/></p>
            <div class="meta">
              <a href="{/rss/channel/link}" target="_blank">Visit Website &#8594;</a>
            </div>
          </header>
          <xsl:for-each select="/rss/channel/item">
            <div class="item">
              <h3>
                <a href="{link}" target="_blank">
                  <xsl:value-of select="title"/>
                </a>
              </h3>
              <div class="item-meta">
                Published on <xsl:value-of select="pubDate"/>
              </div>
              <div class="item-desc">
                <xsl:value-of select="description" disable-output-escaping="yes"/>
              </div>
            </div>
          </xsl:for-each>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
