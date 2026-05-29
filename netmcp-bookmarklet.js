/**
 * netmcp Browser Bookmarklet
 * 
 * Installation:
 * 1. Create a new bookmark in your browser
 * 2. Title: "netmcp Tools"
 * 3. Paste the entire code block below as the URL
 * 
 * Usage: Click the bookmark from any page
 */

javascript:(function() {
  const NETMCP_URL = 'https://netmcp.hwmnbn.me/mcp';
  const currentUrl = window.location.href;
  const currentTitle = document.title;

  // Tool categories
  const tools = {
    'Browser Tools': {
      'Screenshot': { tool: 'screenshot', params: { url: currentUrl } },
      'Get Content': { tool: 'get_content', params: { url: currentUrl } },
      'Get Markdown': { tool: 'get_markdown', params: { url: currentUrl } },
      'Click Element': { tool: 'click', params: { url: currentUrl, selector: '' } },
      'Fill Form': { tool: 'fill_form', params: { url: currentUrl, data: '{}' } }
    },
    'OSINT': {
      'Shodan Search': { tool: 'shodan_search', params: { query: '' } },
      'IP Lookup': { tool: 'ipwhois_lookup', params: { ip: '' } },
      'Censys Search': { tool: 'censys_search', params: { query: '' } },
      'DNS History': { tool: 'securitytrails_dns', params: { domain: '' } }
    },
    'GitHub': {
      'Search Repos': { tool: 'github_search', params: { query: '' } },
      'Search Exploits': { tool: 'github_exploit_search', params: { query: '' } }
    },
    'Security': {
      'CVE Lookup': { tool: 'nvd_lookup', params: { cve: '' } },
      'ExploitDB Search': { tool: 'exploitdb_search', params: { query: '' } },
      'Vulnerability Scan': { tool: 'osv_scan', params: { package: '' } }
    },
    'Image': {
      'Generate Image': { tool: 'generate_image', params: { prompt: '' } }
    }
  };

  // Create modal UI
  const modal = document.createElement('div');
  modal.id = 'netmcp-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  const container = document.createElement('div');
  container.style.cssText = `
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 20px;
    border-radius: 8px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  `;

  // Header
  const header = document.createElement('h2');
  header.textContent = '🔧 netmcp Tools';
  header.style.cssText = `
    margin: 0 0 20px 0;
    color: #0e7;
    font-size: 20px;
  `;
  container.appendChild(header);

  // Category sections
  Object.entries(tools).forEach(([category, toolList]) => {
    const categoryTitle = document.createElement('h3');
    categoryTitle.textContent = category;
    categoryTitle.style.cssText = `
      color: #4ec9b0;
      font-size: 14px;
      margin: 15px 0 8px 0;
      text-transform: uppercase;
    `;
    container.appendChild(categoryTitle);

    Object.entries(toolList).forEach(([name, { tool, params }]) => {
      const button = document.createElement('button');
      button.textContent = name;
      button.style.cssText = `
        display: block;
        width: 100%;
        padding: 10px;
        margin: 5px 0;
        background: #2d2d2d;
        color: #d4d4d4;
        border: 1px solid #404040;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
      `;
      button.onmouseover = () => {
        button.style.background = '#383838';
        button.style.borderColor = '#0e7';
      };
      button.onmouseout = () => {
        button.style.background = '#2d2d2d';
        button.style.borderColor = '#404040';
      };
      button.onclick = () => executeTool(tool, params, name);
      container.appendChild(button);
    });
  });

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Close';
  closeBtn.style.cssText = `
    width: 100%;
    padding: 10px;
    margin-top: 15px;
    background: #404040;
    color: #d4d4d4;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  `;
  closeBtn.onclick = () => modal.remove();
  container.appendChild(closeBtn);

  modal.appendChild(container);
  document.body.appendChild(modal);

  // Close on ESC
  const closeOnEsc = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', closeOnEsc);
    }
  };
  document.addEventListener('keydown', closeOnEsc);

  async function executeTool(toolName, params, displayName) {
    // Prompt for any empty params
    for (const [key, value] of Object.entries(params)) {
      if (!value) {
        const input = prompt(`Enter ${key} for ${displayName}:`);
        if (input === null) return;
        params[key] = input;
      }
    }

    const payload = {
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: { name: toolName, arguments: params }
    };

    try {
      const response = await fetch(NETMCP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.error) {
        alert('Error: ' + data.error.message);
      } else {
        // Display result
        const resultModal = document.createElement('div');
        resultModal.style.cssText = modal.style.cssText;
        const resultContainer = document.createElement('div');
        resultContainer.style.cssText = container.style.cssText;
        resultContainer.style.maxWidth = '800px';
        
        const title = document.createElement('h3');
        title.textContent = '✓ ' + displayName;
        title.style.color = '#0e7';
        resultContainer.appendChild(title);

        const result = document.createElement('pre');
        result.style.cssText = `
          background: #0d0d0d;
          padding: 10px;
          border-radius: 4px;
          font-size: 11px;
          overflow-x: auto;
          color: #0e7;
          max-height: 50vh;
        `;
        result.textContent = JSON.stringify(data.result, null, 2);
        resultContainer.appendChild(result);

        const backBtn = document.createElement('button');
        backBtn.textContent = '← Back';
        backBtn.style.cssText = closeBtn.style.cssText;
        backBtn.onclick = () => resultModal.remove();
        resultContainer.appendChild(backBtn);

        resultModal.appendChild(resultContainer);
        modal.parentNode.replaceChild(resultModal, modal);
      }
    } catch (error) {
      alert('Failed to execute tool: ' + error.message);
    }
  }
})();
