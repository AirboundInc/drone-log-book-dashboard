/**
 * Drone Inventory Service
 * Handles fetching and parsing drone inventory from Drone Logbook API
 */

/**
 * Fetch the drone inventory from the proxy
 * @returns {Promise<Array>} Array of drone objects with id and name
 */
export async function fetchDroneInventory() {
  try {
    console.log('🚁 Fetching drone inventory...');
    
    const response = await fetch('/api/drones/inventory');
    
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      
      // Try to get error details from response
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        }
      } catch (e) {
        // Response wasn't JSON
      }
      
      // Special handling for auth errors
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in first.');
      }
      
      throw new Error(errorMessage);
    }

    const html = await response.text();
    console.log(`📄 Received HTML, length: ${html.length}`);

    if (!html || html.length === 0) {
      throw new Error('Empty response from server. Server may be unavailable.');
    }

    const drones = parseDroneListFromHTML(html);
    console.log(`✅ Successfully parsed ${drones.length} drones`);
    
    if (drones.length === 0) {
      console.warn('⚠️ No drones found in the inventory');
    }
    
    return drones;
  } catch (err) {
    console.error('❌ Error fetching drone inventory:', err);
    throw new Error(`Failed to fetch drone inventory: ${err.message}`);
  }
}

/**
 * Parse drone list from HTML
 * @param {string} html - HTML content from drone list page
 * @returns {Array} Array of drone objects
 */
export function parseDroneListFromHTML(html) {
  const drones = [];
  const seenIds = new Set();

  try {
    // Method 1: Use DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Look for links that contain drone IDs
    const droneLinks = doc.querySelectorAll('a[href*="/inventory/droneDetail.php?id="]');
    
    console.log(`🔍 Found ${droneLinks.length} drone links via DOMParser`);
    
    droneLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const match = href.match(/id=([A-F0-9\-]+)/i);
      
      if (match && match[1] && !seenIds.has(match[1])) {
        const droneId = match[1];
        const droneName = link.textContent.trim() || `Drone ${droneId.substring(0, 8)}`;
        
        drones.push({
          id: droneId,
          name: droneName,
          url: href
        });
        
        seenIds.add(droneId);
        console.log(`  ✓ Parsed drone: ${droneName} (${droneId})`);
      }
    });
  } catch (err) {
    console.warn('⚠️ DOMParser method failed, trying regex fallback:', err.message);
    
    // Method 2: Regex fallback
    const droneRegex = /href="([^"]*\/inventory\/droneDetail\.php\?id=([A-F0-9\-]+)[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    let match;

    while ((match = droneRegex.exec(html)) !== null) {
      const droneId = match[2];
      
      if (!seenIds.has(droneId)) {
        const droneName = match[3].trim() || `Drone ${droneId.substring(0, 8)}`;
        
        drones.push({
          id: droneId,
          name: droneName,
          url: match[1]
        });
        
        seenIds.add(droneId);
        console.log(`  ✓ Parsed drone via regex: ${droneName} (${droneId})`);
      }
    }

    if (drones.length > 0) {
      console.log(`✅ Regex fallback found ${drones.length} drones`);
    }
  }

  if (drones.length === 0) {
    console.warn('⚠️ No drones found in HTML. HTML preview:');
    console.warn(html.substring(0, 1000));
  }

  return drones;
}

/**
 * Get the Drone Logbook URL for a specific drone
 * @param {string} droneId - Drone UUID
 * @returns {string} Drone detail URL
 */
export function getDroneDetailUrl(droneId) {
  return `https://www.dronelogbook.com/inventory/droneDetail.php?id=${droneId}`;
}

/**
 * Format drone data for UI display
 * @param {Object} drone - Drone object from parsed data
 * @returns {Object} Formatted drone object
 */
export function formatDroneData(drone) {
  return {
    id: drone.id,
    name: drone.name || 'Unknown Drone',
    displayName: drone.name || `Drone ${drone.id.substring(0, 8)}`,
    url: drone.url
  };
}
