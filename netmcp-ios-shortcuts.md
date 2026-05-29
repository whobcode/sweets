/*
 * netmcp iOS Shortcut
 * 
 * Installation Instructions:
 * 1. Download the Shortcuts app (iOS 13+)
 * 2. Copy the shortcut JSON below and import it, OR
 * 3. Create these shortcuts manually following the steps below
 * 
 * Quick Setup:
 * - Open Shortcuts app
 * - Tap + to create new shortcut
 * - Add actions following the templates below
 * - Name each shortcut accordingly
 */

// ===== SHORTCUT 1: Screenshot Current Page =====
// Name: "netmcp: Screenshot"
// Trigger: Siri, Widget, Share Sheet
/*
Steps:
1. Ask for URL (with default: current webpage)
2. Make a POST request to: https://netmcp.hwmnbn.me/mcp
   Body (JSON):
   {
     "jsonrpc": "2.0",
     "id": "1",
     "method": "tools/call",
     "params": {
       "name": "screenshot",
       "arguments": {"url": "[url_from_step_1]"}
     }
   }
3. Display result in Alert
*/

// ===== SHORTCUT 2: OSINT IP Lookup =====
// Name: "netmcp: IP Lookup"
/*
Steps:
1. Ask for IP address
2. POST to https://netmcp.hwmnbn.me/mcp
   Body:
   {
     "jsonrpc": "2.0",
     "id": "1",
     "method": "tools/call",
     "params": {
       "name": "ipwhois_lookup",
       "arguments": {"ip": "[ip_address]"}
     }
   }
3. Display formatted result
*/

// ===== SHORTCUT 3: Shodan Search =====
// Name: "netmcp: Shodan Search"
/*
Steps:
1. Ask for search query
2. POST to https://netmcp.hwmnbn.me/mcp
   Body:
   {
     "jsonrpc": "2.0",
     "id": "1",
     "method": "tools/call",
     "params": {
       "name": "shodan_search",
       "arguments": {"query": "[search_query]"}
     }
   }
3. Parse JSON response
4. Create rich list of results
5. Copy to clipboard & show
*/

// ===== SHORTCUT 4: GitHub Exploit Search =====
// Name: "netmcp: GitHub Exploits"
/*
Steps:
1. Ask for search term
2. POST to https://netmcp.hwmnbn.ee/mcp
   Body:
   {
     "jsonrpc": "2.0",
     "id": "1",
     "method": "tools/call",
     "params": {
       "name": "github_exploit_search",
       "arguments": {"query": "[search_term]"}
     }
   }
3. Parse & display results
4. Option to open in GitHub
*/

// ===== SHORTCUT 5: CVE Lookup =====
// Name: "netmcp: CVE Lookup"
/*
Steps:
1. Ask for CVE ID (e.g., CVE-2024-1234)
2. POST to https://netmcp.hwmnbn.me/mcp
   Body:
   {
     "jsonrpc": "2.0",
     "id": "1",
     "method": "tools/call",
     "params": {
       "name": "nvd_lookup",
       "arguments": {"cve": "[cve_id]"}
     }
   }
3. Show formatted vulnerability details
*/

// ===== SHORTCUT 6: Generate Image =====
// Name: "netmcp: Generate Image"
/*
Steps:
1. Ask for image prompt
2. POST to https://netmcp.hwmnbn.me/mcp
   Body:
   {
     "jsonrpc": "2.0",
     "id": "1",
     "method": "tools/call",
     "params": {
       "name": "generate_image",
       "arguments": {"prompt": "[prompt_text]"}
     }
   }
3. Wait for response
4. Display generated image
5. Save to Photos if desired
*/

// ===== MASTER SHORTCUT: netmcp Launcher =====
// Name: "netmcp Tools"
// This creates a menu to run other shortcuts
/*
Steps:
1. Create menu:
   Choose from list:
   - 📸 Screenshot
   - 🔍 IP Lookup
   - 🎯 Shodan Search
   - 💻 GitHub Exploits
   - 🔴 CVE Lookup
   - 🎨 Generate Image
   - ⚙️ Custom Tool

2. Based on choice, run corresponding shortcut
   (Or use Ask Each Time to prompt for parameters)

3. If Custom Tool selected:
   - Ask for tool name
   - Ask for parameter (JSON format)
   - Execute with POST request
*/

// ===== AUTOMATION IDEAS =====
// Automations you can create:
// 1. NFC Tag → Trigger IP lookup
// 2. Home Screen Widget → Quick screenshot tool
// 3. Time of Day → Scheduled security scans
// 4. When I Open App → Run custom OSINT search
// 5. Bluetooth Connection → Auto-screenshot connected device info
// 6. Notification → Trigger CVE checks on security alerts
// 7. Siri Voice Command → "Hey Siri, netmcp [tool name]"

// ===== SIRI CONFIGURATION =====
// Add voice triggers to shortcuts for hands-free operation
// Examples:
// - "netmcp screenshot" → Takes screenshot
// - "netmcp lookup [IP]" → IP geolocation
// - "netmcp search [query]" → GitHub search
// - "netmcp exploit [term]" → Exploit search
// - "netmcp scan [package]" → Vulnerability scan

// ===== SHARE SHEET INTEGRATION =====
// Configure Share Sheet to trigger shortcuts
// 1. Open Shortcuts app
// 2. Edit shortcut → i icon → Share Sheet
// 3. Enable "Show in Share Sheet"
// 4. Select "Websites" or "Text" as input type
// 5. Now you can share URLs directly to netmcp tools

// ===== ALTERNATIVE: Import from iCloud Link =====
// If you create these in the Shortcuts app, you can share via iCloud:
// 1. Edit shortcut
// 2. Share icon → Copy iCloud Link
// 3. Share link with others to import

// ===== EXAMPLE: Full JSON Payload Template =====
// Use this structure for all POST requests:
const requestTemplate = {
  jsonrpc: "2.0",
  id: "1",
  method: "tools/call",
  params: {
    name: "tool_name_here",
    arguments: {
      // Tool-specific parameters go here
      param1: "value1",
      param2: "value2"
    }
  }
};

// ===== RESPONSE PARSING =====
// All responses follow this format:
const responseTemplate = {
  jsonrpc: "2.0",
  id: "1",
  result: {
    // Tool-specific result data
  }
  // OR on error:
  // "error": { "code": -1, "message": "Error description" }
};

// ===== SHORTCUT BEST PRACTICES =====
// 1. Always ask for required parameters
// 2. Validate inputs before sending
// 3. Add timeout (30 seconds) to requests
// 4. Show loading indicator while waiting
// 5. Parse errors gracefully
// 6. Store frequently-used queries
// 7. Use dictionaries to build request payloads
// 8. Add success/failure notifications
// 9. Support deep linking with URL schemes
// 10. Test with fallback URL (tru-bone.workers.dev)

// ===== DEBUGGING =====
// To test shortcuts:
// 1. Open Shortcuts app
// 2. Tap Details icon while editing
// 3. Enable "Show When Run"
// 4. Run shortcut and check each step
// 5. Use Ask for [Text] to see intermediate values
// 6. Check response with "Show Result" action
