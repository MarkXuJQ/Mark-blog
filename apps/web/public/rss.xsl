<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> RSS Feed</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
        <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/rss.xml" />
        <link rel="alternate" type="application/atom+xml" title="Atom Feed" href="/atom.xml" />
        <link rel="alternate" type="application/json" title="JSON Feed" href="/feed.json" />
        <style type="text/css">
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; color: #333; line-height: 1.6; margin: 0; padding: 0; min-height: 100vh; }
          
          /* Background and Blur Layers */
          .bg-fixed {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -2;
            background-image: url('/images/image1.jpg');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }
          .overlay-fixed {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            background-color: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            transition: background-color 0.5s;
          }

          .container { 
            position: relative;
            z-index: 1;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 4rem 1rem; 
          }
          
          /* Header Card */
          header { 
            background-color: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            padding: 2.5rem;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            margin-bottom: 3rem;
            text-align: center;
          }

          h1 { margin: 0 0 0.5rem 0; font-size: 2.2rem; font-weight: 800; color: #111; letter-spacing: -0.025em; }
          p.desc { color: #555; margin: 0; font-size: 1.1rem; }
          
          .meta { margin-top: 1.5rem; }
          .meta a { 
            display: inline-block;
            background-color: #000;
            color: #fff;
            text-decoration: none;
            padding: 0.6rem 1.2rem;
            border-radius: 9999px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: transform 0.2s, opacity 0.2s;
          }
          .meta a:hover { transform: translateY(-1px); opacity: 0.9; }
          
          /* Blog Post Cards */
          .item { 
            background-color: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            margin-bottom: 2rem; 
            transition: transform 0.2s, box-shadow 0.2s;
          }
          
          .item:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }

          .item h3 { margin: 0 0 0.8rem 0; font-size: 1.6rem; font-weight: 700; line-height: 1.3; }
          .item h3 a { color: #111; text-decoration: none; transition: color 0.2s; }
          .item h3 a:hover { color: #2563eb; }
          
          .item-meta { font-size: 0.875rem; color: #666; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
          .item-desc { color: #333; font-size: 1rem; line-height: 1.7; }
          .item-desc img { max-width: 100%; border-radius: 8px; margin: 1rem 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          
          .notice { 
            background-color: rgba(238, 242, 255, 0.9); 
            border: 1px solid rgba(199, 210, 254, 0.5); 
            color: #3730a3; 
            padding: 1rem; 
            border-radius: 12px; 
            margin-bottom: 2rem; 
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          
          /* Dark Mode */
          @media (prefers-color-scheme: dark) {
            body { color: #eee; }
            .overlay-fixed { background-color: rgba(0, 0, 0, 0.7); }
            
            header { 
              background-color: rgba(20, 20, 20, 0.85); 
              box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }

            .item {
              background-color: rgba(20, 20, 20, 0.85);
              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            .item:hover {
              box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            }

            h1 { color: #fff; }
            p.desc { color: #aaa; }
            
            .meta a { background-color: #fff; color: #000; }
            
            .item h3 a { color: #fff; }
            .item h3 a:hover { color: #60a5fa; }
            .item-meta { color: #888; }
            .item-desc { color: #ccc; }
            
            .notice { 
              background-color: rgba(30, 27, 75, 0.9); 
              border-color: rgba(49, 46, 129, 0.5); 
              color: #c7d2fe; 
            }
          }
          
          @media (max-width: 640px) {
            .container { padding: 2rem 1rem; }
            header { padding: 2rem 1.5rem; }
            .item { padding: 1.5rem; }
          }
        </style>
      </head>
      <body>
        <div class="bg-fixed"></div>
        <div class="overlay-fixed"></div>
        
        <div class="container">
          <div class="notice">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
            <div>
              <strong>RSS Feed Preview</strong>
              <div style="font-size: 0.8em; margin-top: 0.2rem; opacity: 0.8;">
                This is a web preview of the RSS feed. To subscribe, copy the URL from your browser's address bar.
              </div>
            </div>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
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