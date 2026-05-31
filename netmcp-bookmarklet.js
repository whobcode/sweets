/**
 * netmcp Browser Bookmarklet
 *
 * Calls the netmcp Worker (https://netapi.hwmnbn.me), which handles OAuth and
 * the MCP protocol — the raw netmcp endpoint can't be called from the browser.
 *
 * Installation:
 *   1. Create a new bookmark in your browser
 *   2. Title: "netmcp Tools"
 *   3. Paste the entire javascript: line below as the URL
 */

javascript:(function() {
  const API = 'https://netapi.hwmnbn.me';
  const here = window.location.href;

  // [tool, label, {param: defaultValue}] — empty default means "prompt me".
  const tools = {
    'Browser': [
      ['browser_screenshot', 'Screenshot', { url: here }],
      ['browser_get_content', 'Get Content', { url: here }],
      ['browser_get_markdown', 'Get Markdown', { url: here }],
      ['browser_get_links', 'Get Links', { url: here }],
      ['browser_click', 'Click Element', { url: here, selector: '' }],
    ],
    'OSINT': [
      ['shodan_device_search', 'Shodan Search', { query: '' }],
      ['censys_host_search', 'Censys Search', { query: '' }],
      ['ipwhois_enrichment', 'IP Lookup', { ip: '' }],
      ['securitytrails_dns_history', 'DNS History', { domain: '' }],
      ['wayback_machine_lookup', 'Wayback', { url: here }],
    ],
    'Code / Exploits': [
      ['github_exploit_search', 'GitHub Exploits', { query: '' }],
      ['gitlab_code_search', 'GitLab Code', { query: '' }],
      ['exploitdb_search', 'ExploitDB', { query: '' }],
    ],
    'CVE': [
      ['nvd_cve_lookup', 'CVE Lookup', { cveId: '' }],
      ['osv_vulnerability_scan', 'Vuln Scan', { packageName: '', ecosystem: '' }],
    ],
    'AI': [
      ['generateImage', 'Generate Image', { prompt: '' }],
    ],
  };

  const overlayCss = 'position:fixed;inset:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  const cardCss = 'background:#1e1e1e;color:#d4d4d4;padding:20px;border-radius:8px;max-width:520px;max-height:82vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5)';

  const modal = document.createElement('div');
  modal.style.cssText = overlayCss;
  const card = document.createElement('div');
  card.style.cssText = cardCss;

  const h = document.createElement('h2');
  h.textContent = '🔧 netmcp Tools';
  h.style.cssText = 'margin:0 0 16px;color:#0e7;font-size:20px';
  card.appendChild(h);

  Object.entries(tools).forEach(([cat, list]) => {
    const ct = document.createElement('h3');
    ct.textContent = cat;
    ct.style.cssText = 'color:#4ec9b0;font-size:13px;margin:14px 0 6px;text-transform:uppercase';
    card.appendChild(ct);

    list.forEach(([tool, label, params]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'display:block;width:100%;padding:10px;margin:4px 0;background:#2d2d2d;color:#d4d4d4;border:1px solid #404040;border-radius:4px;cursor:pointer;font-size:13px';
      b.onmouseover = () => { b.style.background = '#383838'; b.style.borderColor = '#0e7'; };
      b.onmouseout = () => { b.style.background = '#2d2d2d'; b.style.borderColor = '#404040'; };
      b.onclick = () => run(tool, Object.assign({}, params), label);
      card.appendChild(b);
    });
  });

  const close = document.createElement('button');
  close.textContent = '✕ Close';
  close.style.cssText = 'width:100%;padding:10px;margin-top:14px;background:#404040;color:#d4d4d4;border:none;border-radius:4px;cursor:pointer;font-size:13px';
  close.onclick = () => modal.remove();
  card.appendChild(close);

  modal.appendChild(card);
  document.body.appendChild(modal);

  const onEsc = (e) => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', onEsc); } };
  document.addEventListener('keydown', onEsc);

  async function run(tool, params, label) {
    for (const [k, v] of Object.entries(params)) {
      if (v === '') {
        const input = prompt('Enter ' + k + ' for ' + label + ':');
        if (input === null) return;
        params[k] = input;
      }
    }

    const result = document.createElement('pre');
    result.style.cssText = 'background:#0d0d0d;padding:10px;border-radius:4px;font-size:11px;overflow:auto;color:#0e7;max-height:55vh;white-space:pre-wrap;word-break:break-word';
    result.textContent = '⏳ Calling ' + tool + ' ...';

    const rcard = document.createElement('div');
    rcard.style.cssText = cardCss;
    rcard.style.maxWidth = '820px';
    const rt = document.createElement('h3');
    rt.textContent = label;
    rt.style.color = '#0e7';
    rcard.appendChild(rt);
    rcard.appendChild(result);
    const back = document.createElement('button');
    back.textContent = '← Back';
    back.style.cssText = close.style.cssText;
    back.onclick = () => { rmodal.remove(); document.body.appendChild(modal); };
    rcard.appendChild(back);
    const rmodal = document.createElement('div');
    rmodal.style.cssText = overlayCss;
    rmodal.appendChild(rcard);
    modal.remove();
    document.body.appendChild(rmodal);

    try {
      const res = await fetch(API + '/tool/' + encodeURIComponent(tool), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      const r = data.result || data;
      const texts = (r.content || []).filter((c) => c.type === 'text').map((c) => c.text);
      const prefix = r.isError ? '⚠️ Tool error:\n\n' : '';
      result.textContent = prefix + (texts.length ? texts.join('\n') : JSON.stringify(data, null, 2));
    } catch (e) {
      result.textContent = '❌ ' + e.message;
    }
  }
})();
