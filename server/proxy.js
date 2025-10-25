// server/proxy.js (CommonJS)
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const got = require('got');
const { CookieJar } = require('tough-cookie');
const querystring = require('querystring');

// Function to extract flight data from dronelogbook.com HTML
function extractFlightDataFromHTML(html, rangeDays = 0) {
  try {
    console.log('🔍 Parsing HTML...');
    
    // PRIORITY 1: Extract dashboard statistics first (fast)
    const stats = extractDashboardStats(html, rangeDays);
    if (stats && Object.keys(stats).length > 0) {
      console.log('✅ Dashboard stats extracted');
    }
    
    // PRIORITY 1.5: Extract chart data
    console.log('🔍 Attempting to extract chart data...');
    const chartData = extractChartData(html);
    console.log('📊 Chart data result:', {
      flyingTimePoints: chartData?.flyingTime?.length || 0,
      flightCountPoints: chartData?.flightCounts?.length || 0
    });
    
    if (chartData && (chartData.flyingTime.length > 0 || chartData.flightCounts.length > 0)) {
      stats.chartData = chartData;
      console.log('✅ Chart data extracted and added to stats');
      console.log('📊 Flying Time data points:', chartData.flyingTime.length);
      console.log('📊 Sample flying time:', JSON.stringify(chartData.flyingTime.slice(0, 3), null, 2));
      console.log('📊 Flight Count data points:', chartData.flightCounts.length);
      console.log('📊 Sample flight counts:', JSON.stringify(chartData.flightCounts.slice(0, 3), null, 2));
    } else {
      console.log('⚠️ No chart data found or chart data is empty');
    }
    
    // PRIORITY 2: Parse flights from the dashboard
    const flights = [];
    
    // Method 1: Look for table rows first (most structured approach)
    const tableRowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const tableRows = html.match(tableRowPattern);
    
    if (tableRows && tableRows.length > 1) { // Skip if only header row
      console.log(`📋 Found ${tableRows.length} table rows`);
      
      for (let i = 0; i < tableRows.length; i++) {
        const row = tableRows[i];
        
        // Skip header rows
        if (row.includes('<th') || row.includes('Date') && row.includes('Aircraft')) {
          continue;
        }
        
        // Extract table cells
        const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const cells = [];
        let cellMatch;
        
        while ((cellMatch = cellPattern.exec(row)) !== null) {
          // Clean cell content
          const cellContent = cellMatch[1]
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          cells.push(cellContent);
        }
        
        if (cells.length >= 6) {
          // Parse based on expected table structure: Date, Aircraft, Duration, Location, Pilot, Purpose
          const flight = {
            id: `flight_${flights.length + 1}`,
            date: parseFlightDate(cells[0]) || new Date().toISOString().split('T')[0],
            aircraft: cells[1] && cells[1] !== 'Unknown Aircraft' ? cells[1] : extractAircraftFromText(row),
            duration: cells[2] || '00:00:00',
            location: cells[3] && cells[3] !== 'Unknown Location' ? cells[3] : extractLocationFromText(row),
            pilot: cells[4] || 'Flight Dev',
            purpose: cells[5] || 'Test Flight',
            notes: `Flight logged on ${cells[0]}`,
            rawData: cells.join(' | ')
          };
          
          flights.push(flight);
        }
      }
    }
    
    // Method 2: Parse raw text to find flight blocks (slower fallback)
    if (flights.length === 0) {
      console.log('📝 No table data found, parsing raw text...');
      
      // Remove all HTML tags to get clean text
      const cleanText = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                            .replace(/<style[\s\S]*?<\/style>/gi, '')
                            .replace(/<[^>]+>/g, '\n')
                            .replace(/\s+/g, ' ')
                            .trim();
      
      // Split by flight ID pattern [XXXX]
      const flightBlocks = cleanText.split(/(?=\[\d+\])/);
      
      for (let i = 0; i < flightBlocks.length; i++) {
        const block = flightBlocks[i].trim();
        if (!block || block.length < 20) continue;
        
        const flight = extractFlightFromBlock(block, i + 1);
        if (flight) {
          flights.push(flight);
        }
      }
    }
    
    // Return both flights and stats
    return { flights, stats };
    
  } catch (error) {
    console.error('❌ Error parsing HTML:', error);
    return { flights: [], stats: null };
  }
}

function parseFlightDate(dateStr) {
  try {
    // Handle MM/DD/YYYY HH:MM AM/PM format like "10/24/2025 01:14 PM"
    const dateTimeMatch = dateStr.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})\s+(AM|PM)/);
    if (dateTimeMatch) {
      const [, date] = dateTimeMatch;
      const [month, day, year] = date.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Handle ISO format
    if (dateStr.match(/\d{4}-\d{2}-\d{2}/)) {
      return dateStr.match(/\d{4}-\d{2}-\d{2}/)[0];
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

function extractAircraftFromText(text) {
  const aircraftPatterns = [
    /(AA-[A-Z]+-\d+)/,
    /(DJI[^,\s]*)/i,
    /([A-Z]{2,4}-[A-Z0-9]{3,})/,
    /(Mavic[^,\s]*)/i,
    /(Phantom[^,\s]*)/i
  ];
  
  for (const pattern of aircraftPatterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  return 'Unknown Aircraft';
}

function extractAircraftFromText(text) {
  // Look for aircraft patterns in the text
  const aircraftPatterns = [
    /AA-[A-Z]+-\d+/,
    /DJI[^,\s]*/,
    /Mavic[^,\s]*/,
    /Phantom[^,\s]*/,
    /Mini[^,\s]*/,
    /Air[^,\s]*/
  ];
  
  for (const pattern of aircraftPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return 'Unknown Aircraft';
}

function extractLocationFromText(text) {
  // Look for location patterns - typically city, state/region format
  const locationPatterns = [
    /([A-Z][a-z]+,\s*[A-Z][a-z]+\s+[a-z]+)/,  // "Sonnadenahalli, Hosakote taluk"
    /([A-Z][a-z]+,\s*[A-Z][a-z]+)/,           // "City, State"
    /([A-Z][a-z]+\s+[A-Z][a-z]+)/             // "Place Name"
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return 'Unknown Location';
}

function extractFlightFromTableRow(row, index) {
  try {
    // Extract table cells
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let cellMatch;
    
    while ((cellMatch = cellPattern.exec(row)) !== null) {
      // Clean cell content - remove HTML tags and normalize whitespace
      const cellContent = cellMatch[1]
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(cellContent);
    }
    
    // Need at least date and some flight info
    if (cells.length < 2) {
      return null;
    }
    
    // Based on your screenshot, the table structure appears to be:
    // Date | Aircraft | Duration | Location | Pilot | Purpose | Actions
    const flight = {
      id: `flight_${index}`,
      date: parseFlightDate(cells[0]) || new Date().toISOString().split('T')[0],
      aircraft: cells[1] && cells[1] !== 'Unknown Aircraft' ? cells[1] : extractAircraftFromText(row),
      duration: cells[2] || '00:00:00',
      location: cells[3] && cells[3] !== 'Unknown Location' ? cells[3] : extractLocationFromText(row),
      pilot: cells[4] || 'Flight Dev',
      purpose: cells[5] || 'Test Flight',
      notes: `Flight logged on ${cells[0]}`,
      rawData: cells.join(' | ')
    };
    
    // Only include if we have meaningful data
    if (flight.date && (flight.aircraft !== 'Unknown Aircraft' || flight.duration !== '00:00:00')) {
      return flight;
    }
    
    return null;
    
  } catch (error) {
    console.error(`❌ Error extracting flight from table row ${index}:`, error);
    return null;
  }
}

function extractFlightFromContext(flightId, flightDateTime, context, index) {
  try {
    // Extract aircraft from context
    const aircraft = extractAircraftFromText(context);
    
    // Extract location from context  
    const location = extractLocationFromText(context);
    
    // Look for duration pattern
    const durationMatch = context.match(/(\d{2}:\d{2}:\d{2})/);
    const duration = durationMatch ? durationMatch[1] : '00:00:00';
    
    // Parse date
    const date = flightDateTime.split(' ')[0];
    
    const flight = {
      id: flightId,
      date: date,
      aircraft: aircraft,
      duration: duration,
      location: location,
      pilot: 'Flight Dev',
      purpose: 'Test Flight',
      notes: `Flight ${flightId} - ${flightDateTime}`,
      rawData: context.substring(0, 200)
    };
    
    return flight;
    
  } catch (error) {
    console.error(`❌ Error extracting flight from context:`, error);
    return null;
  }
}

// Extract flight from a text block containing all flight data
function extractFlightFromBlock(block, index) {
  try {
    
    // Extract flight ID: [1368]
    const flightIdMatch = block.match(/\[(\d+)\]/);
    if (!flightIdMatch) {
      console.log(`❌ No flight ID found in block ${index}`);
      return null;
    }
    const flightId = flightIdMatch[1];
    
    // Extract flight date/time: "Flight 2025-10-24 13:14:36"
    const flightDateMatch = block.match(/Flight\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
    if (!flightDateMatch) {
      console.log(`❌ No flight date found for flight ${flightId}`);
      return null;
    }
    const flightDate = flightDateMatch[1];
    const flightTime = flightDateMatch[2];
    const fullDateTime = `${flightDate} ${flightTime}`;
    
    // Extract duration: "00:03:27" (appears after the flight timestamp)
    const durationMatch = block.match(/(\d{2}:\d{2}:\d{2})\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/);
    const duration = durationMatch ? durationMatch[1] : '00:00:00';
    
    // Extract aircraft: "AA-TRT-0028"
    const aircraftMatch = block.match(/(AA-[A-Z]+-\d+)/);
    const aircraft = aircraftMatch ? aircraftMatch[1] : 'Unknown Aircraft';
    
    // Extract pilot: "Pilot: Flight Dev"
    const pilotMatch = block.match(/Pilot:\s*([^\n]+)/);
    const pilot = pilotMatch ? pilotMatch[1].trim() : 'Flight Dev';
    
    // Extract purpose: "Test Flight" (appears before location)
    const purposeMatch = block.match(/\/\s*([^\/\n]+?)\s+(?:[A-Z][a-z]+,|$)/);
    const purpose = purposeMatch ? purposeMatch[1].trim() : 'Test Flight';
    
    // Extract location: "Sonnadenahalli, Hosakote taluk"
    const locationMatch = block.match(/([A-Z][a-z]+,\s*[A-Z][a-z]+\s+[a-z]+)/);
    const location = locationMatch ? locationMatch[1] : 'Unknown Location';
    
    const flight = {
      id: flightId,
      date: fullDateTime,
      aircraft: aircraft,
      duration: duration,
      location: location,
      pilot: pilot,
      purpose: purpose,
      notes: `Flight ${flightId} - ${purpose}`,
      rawData: block.substring(0, 200)
    };
    
    return flight;
    
  } catch (error) {
    console.error(`❌ Error parsing flight block ${index}:`, error.message);
    return null;
  }
}

function extractFlightFromElement(element, index, html) {
  try {
    // Remove HTML tags and extract text
    const text = element.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Skip if element is too short or contains no useful data
    if (text.length < 10) {
      return null;
    }
    
    console.log(`🔍 Raw element text: "${text}"`);
    
    // Extract flight ID early for use throughout the function
    const bracketMatch = text.match(/\[(\d+)\]/);
    const bracketId = bracketMatch ? bracketMatch[1] : null;
    
    // Look for actual flight time in the "Duration" column (which is mislabeled)
    // In dronelogbook.com, what they call "Duration" is actually the flight TIME (like 13:14:36)
    const flightTimeMatch = text.match(/(\d{1,2}:\d{2}:\d{2})/);
    let flightTime = flightTimeMatch ? flightTimeMatch[1] : null;
    
    // Look for date pattern - should be current date or specific flight date
    let flightDate = null;
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dateMatch) {
      const [month, day, year] = dateMatch[1].split('/');
      flightDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else {
      // Default to today if no date found
      flightDate = '2025-10-24';
    }
    
    // Combine date and time for proper display
    let fullDateTime = null;
    if (flightDate && flightTime) {
      fullDateTime = `${flightDate} ${flightTime}`;
    }
    
    // Extract ACTUAL flight duration from the HTML data
    let duration = '00:03:30'; // Default fallback
    
    // Look for actual duration in the raw data format: "00:03:27 2025-10-24 13:14:36"
    // The duration appears on the line after the flight header
    const durationPattern = /(\d{2}:\d{2}:\d{2})\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/;
    const durationMatch = text.match(durationPattern);
    
    if (durationMatch) {
      duration = durationMatch[1]; // Use the actual duration found
      console.log(`📏 Found actual duration: ${duration}`);
    } else if (fullHtml && bracketMatch) {
      // If not found in current text, search in the broader HTML context
      const flightId = bracketMatch[1];
      const contextPattern = new RegExp(`\\[${flightId}\\][\\s\\S]*?(\\d{2}:\\d{2}:\\d{2})\\s+\\d{4}-\\d{2}-\\d{2}`, 'i');
      const contextMatch = fullHtml.match(contextPattern);
      if (contextMatch) {
        duration = contextMatch[1];
        console.log(`📏 Found duration in context for flight ${flightId}: ${duration}`);
      }
    }
    
    // Look for aircraft patterns - could be various formats
    let aircraft = 'Unknown Aircraft';
    const aircraftPatterns = [
      /(AA-[A-Z]+-\d+)/,  // AA-TRT-0028 format
      /(DJI[^,\s]*)/i,    // DJI models
      /([A-Z]{2,4}-[A-Z0-9]{3,})/,  // General registration format
      /(Mavic[^,\s]*)/i,  // Mavic series
      /(Phantom[^,\s]*)/i // Phantom series
    ];
    
    for (const pattern of aircraftPatterns) {
      const match = text.match(pattern);
      if (match) {
        aircraft = match[1];
        break;
      }
    }
    
    // Extract location - look for location patterns
    // From your data: "Test Flight Sonnadenahalli, Hosakote taluk"
    let location = 'Unknown Location';
    
    // First try to find location after "Test Flight" text
    const testFlightLocationMatch = text.match(/Test Flight\s+([A-Z][a-z]+,\s*[A-Z][a-z]+\s+[a-z]+)/);
    if (testFlightLocationMatch) {
      location = testFlightLocationMatch[1];
    } else {
      // Look for patterns like "City, State" or longer location strings
      const locationPatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[a-z]+)*)/,  // "Sonnadenahalli, Hosakote taluk"
        /([A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z][a-z]+)/,  // "City Name, State"
        /([A-Z][a-z]+,\s*[A-Z][a-z]+)/  // "City, State"
      ];
      
      for (const pattern of locationPatterns) {
        const match = text.match(pattern);
        if (match) {
          // Make sure it doesn't contain "Test Flight" or aircraft codes
          const potentialLocation = match[1];
          if (!potentialLocation.includes('Test Flight') && !potentialLocation.includes('AA-TRT')) {
            location = potentialLocation;
            break;
          }
        }
      }
    }

    // If aircraft or location are still unknown, try to find a surrounding
    // window in the full HTML using the bracketed flight id (e.g. "[1368]")
    if ((aircraft === 'Unknown Aircraft' || location === 'Unknown Location') && bracketId && fullHtml) {
      try {
        const needle = '[' + bracketId + ']';
        const idx = fullHtml.indexOf(needle);
        if (idx !== -1) {
          // Grab a larger window around the occurrence to include nearby columns/labels
          const start = Math.max(0, idx - 800);
          const end = Math.min(fullHtml.length, idx + 1200);
          const windowHtml = fullHtml.slice(start, end).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

          // Try extracting aircraft from the window
          for (const pattern of aircraftPatterns) {
            const m = windowHtml.match(pattern);
            if (m) {
              aircraft = m[1];
              break;
            }
          }

          // Try extracting location from the window
          const testFlightMatch = windowHtml.match(/Test Flight\s+([A-Z][a-z]+,\s*[A-Z][a-z]+\s+[a-z]+)/);
          if (testFlightMatch) {
            location = testFlightMatch[1];
          } else {
            for (const pattern of locationPatterns) {
              const m = windowHtml.match(pattern);
              if (m && !m[1].includes('Test Flight') && !m[1].includes('AA-TRT')) {
                location = m[1];
                break;
              }
            }
          }
        }
      } catch (e) {
        // Non-fatal — keep defaults
      }
    }
    
    // Extract pilot
    let pilot = 'Flight Dev';  // Default based on your data
    const pilotMatch = text.match(/Pilot:\s*([^,\n\r]+)/i);
    if (pilotMatch) {
      pilot = pilotMatch[1].trim();
    }
    
    // Extract purpose
    let purpose = 'Test Flight';  // Default based on your data
    const purposePatterns = [
      /Purpose:\s*([^,\n\r]+)/i,
      /(Test Flight|Training|Survey|Inspection|Photography)/i
    ];
    
    for (const pattern of purposePatterns) {
      const match = text.match(pattern);
      if (match) {
        purpose = match[1];
        break;
      }
    }
    
    // Use actual flight ID from brackets [1368] or generate one
    let flightId = `flight_${index}`;
    if (bracketMatch) {
      flightId = bracketMatch[1]; // Use the actual bracketed flight ID like "1368"
      console.log(`🆔 Using actual flight ID: ${flightId}`);
    } else if (flightTime) {
      // Create a more unique ID based on flight time as fallback
      const timeId = flightTime.replace(/:/g, '');
      flightId = `flight_${timeId}`;
    }
    
    // Only create flight object if we have essential data (date or aircraft)
    if (fullDateTime || aircraft !== 'Unknown Aircraft') {
      console.log(`✅ Parsed flight: ${aircraft} at ${location} for ${duration}`);
      return {
        id: flightId,
        date: fullDateTime || `${flightDate} ${flightTime}` || new Date().toISOString(),
        aircraft: aircraft,
        duration: duration,
        location: location,
        pilot: pilot,
        purpose: purpose,
        notes: `${purpose} - ${aircraft}`,
        rawData: text.substring(0, 200) // Keep sample for debugging
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting flight from element:', error);
    return null;
  }
}

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function extractAircraft(text) {
  const aircraftPatterns = [
    /aircraft[:\s]*([^,\n]+)/i,
    /drone[:\s]*([^,\n]+)/i,
    /model[:\s]*([^,\n]+)/i,
    /(DJI[^,\s]*|Mavic[^,\s]*|Phantom[^,\s]*|Mini[^,\s]*|Air[^,\s]*)/i
  ];
  
  for (const pattern of aircraftPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return 'Unknown Aircraft';
}

function extractDuration(text) {
  const durationPatterns = [
    /duration[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)/i,
    /time[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)/i,
    /(\d{1,2}:\d{2}(?::\d{2})?)/
  ];
  
  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  return '00:00:00';
}

function extractLocation(text) {
  const locationPatterns = [
    /location[:\s]*([^,\n]+)/i,
    /site[:\s]*([^,\n]+)/i,
    /field[:\s]*([^,\n]+)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return 'Unknown Location';
}

function extractPilot(text) {
  const pilotPatterns = [
    /pilot[:\s]*([^,\n]+)/i,
    /operator[:\s]*([^,\n]+)/i,
    /flown by[:\s]*([^,\n]+)/i
  ];
  
  for (const pattern of pilotPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return 'Unknown Pilot';
}

function extractPurpose(text) {
  const purposePatterns = [
    /purpose[:\s]*([^,\n]+)/i,
    /mission[:\s]*([^,\n]+)/i,
    /reason[:\s]*([^,\n]+)/i
  ];
  
  for (const pattern of purposePatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  if (text.toLowerCase().includes('training')) return 'Training';
  if (text.toLowerCase().includes('survey')) return 'Survey';
  if (text.toLowerCase().includes('inspection')) return 'Inspection';
  if (text.toLowerCase().includes('photography')) return 'Photography';
  
  return 'General Flight';
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:8080', // adjust depending where frontend runs
  credentials: true
}));

// Dev-only session store. Use a persistent store in production.
app.use(session({
  secret: 'replace-with-a-secure-random-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // secure:true when using HTTPS
}));

const SITE_ORIGIN = 'https://www.dronelogbook.com';

// Helper to extract chart data from dashboard HTML
function extractChartData(html) {
  const chartData = {
    flyingTime: [],
    flightCounts: []
  };
  
  try {
    console.log('📊 Extracting chart data from HTML...');
    
    // The chart data format from your example:
    // data: [{
    //   type: "column",
    //   name: "Flying Time",
    //   dataPoints: [{ label: "2024-10", y: 0, yTooltipValue:"0:00:00" }, ...]
    // }, {
    //   type: "column", 
    //   name: "Flights #",
    //   dataPoints: [{ label: "2024-10", y: 0 }, ...]
    // }]
    
    // First, try to find the data: [ ... ] block
    const dataBlockPattern = /data:\s*\[([^\]]+\{[^\}]+\}[^\]]+)\]/s;
    const dataBlockMatch = html.match(dataBlockPattern);
    
    if (!dataBlockMatch) {
      console.log('⚠️ No data block found with standard pattern');
      return chartData;
    }
    
    // Extract Flying Time dataPoints with yTooltipValue
    // Pattern: { label: "2024-10",  y: 0, yTooltipValue:"0:00:00" }
    const flyingTimePattern = /\{\s*label:\s*"([^"]+)"\s*,\s*y:\s*([\d.]+)\s*,\s*yTooltipValue:\s*"([^"]+)"\s*\}/g;
    let flyingTimeMatch;
    const flyingTimeMap = {}; // Use map to avoid duplicates
    
    while ((flyingTimeMatch = flyingTimePattern.exec(html)) !== null) {
      const label = flyingTimeMatch[1];
      const value = parseFloat(flyingTimeMatch[2]);
      const tooltip = flyingTimeMatch[3];
      
      // Only keep the first occurrence or the one with non-zero value
      if (!flyingTimeMap[label] || (value > 0 && flyingTimeMap[label].value === 0)) {
        flyingTimeMap[label] = { label, value, tooltip };
      }
    }
    
    // Convert map back to array
    chartData.flyingTime = Object.values(flyingTimeMap);
    
    // Extract Flight Counts dataPoints
    // These come AFTER the flying time data in the second array
    // Format: { label: "2025-07",  y: 26,  yTooltipValue: 26 }
    // We need to find them after "Flight #" appears (note: singular, not "Flights #")
    const flightsSection = html.indexOf('Flight #');
    if (flightsSection !== -1) {
      const flightsSectionHtml = html.substring(flightsSection);
      // Match pattern with yTooltipValue (number, not time string)
      const flightCountPattern = /\{\s*label:\s*"([^"]+)"\s*,\s*y:\s*([\d.]+)\s*,\s*yTooltipValue:\s*([\d.]+)\s*\}/g;
      let flightCountMatch;
      const flightCountMap = {}; // Use map to avoid duplicates
      
      while ((flightCountMatch = flightCountPattern.exec(flightsSectionHtml)) !== null) {
        const label = flightCountMatch[1];
        const value = parseInt(flightCountMatch[2]);
        
        // Only keep the first occurrence or the one with non-zero value
        if (!flightCountMap[label] || (value > 0 && flightCountMap[label].value === 0)) {
          flightCountMap[label] = { label, value };
        }
      }
      
      // Convert map back to array
      chartData.flightCounts = Object.values(flightCountMap);
    }
    
    console.log(`✅ Extracted ${chartData.flyingTime.length} flying time data points and ${chartData.flightCounts.length} flight count data points`);
    console.log('📊 Sample flight counts:', chartData.flightCounts.slice(0, 5).map(d => `${d.label}: ${d.value}`));
    console.log('📊 All flight count values:', chartData.flightCounts.map(d => d.value));
    
    return chartData;
    
  } catch (error) {
    console.error('❌ Error extracting chart data:', error.message);
    return chartData;
  }
}

// Helper to extract dashboard statistics from HTML
function extractDashboardStats(html, rangeDays = 0) {
  const stats = {};
  
  try {
    console.log(`📊 Extracting dashboard stats (rangeDays=${rangeDays})...`);
    
    // Pattern 1 (PRIORITY): Extract from top bar stat divs - most reliable for filtered data
    // <div class="stat"><p>Flights</p><!--strong>1233</strong--><strong>1233</strong></div>
    // Flying Time
    const flyingTimePattern = /<div class="stat">\s*<p>Flying Time<\/p>\s*<strong>([^<]+)<\/strong>/i;
    const flyingTimeMatch = html.match(flyingTimePattern);
    if (flyingTimeMatch) {
      stats.flyingTime = flyingTimeMatch[1].trim();
      console.log('✅ Extracted Flying Time from top bar:', stats.flyingTime);
    }
    
    // Flights count from header (most reliable - includes filtered data)
    // Handle both formats: with and without HTML comments
    // The HTML has lots of whitespace/newlines, so we need to be very flexible
    
    // The HTML has: <p>Flights</p><!--strong>1233</strong--><strong>100</strong>
    // The top bar ALWAYS shows the ALL-TIME total, regardless of filters
    // We need to match the LAST <strong> tag (the one NOT in comments)
    
    // First, remove all HTML comments from the flights section
    const flightsDebugPattern = /<div class="stat"[^>]*>[\s\S]{0,200}Flights[\s\S]{0,200}<\/div>/i;
    const flightsDebug = html.match(flightsDebugPattern);
    if (flightsDebug) {
      console.log('🔍 Found Flights stat div:', flightsDebug[0]);
      
      // Remove HTML comments and then extract the number
      const flightsHtmlNoComments = flightsDebug[0].replace(/<!--[\s\S]*?-->/g, '');
      console.log('🔍 After removing comments:', flightsHtmlNoComments);
      
      const flightsCleanPattern = /<p>Flights<\/p>\s*<strong>(\d+)<\/strong>/i;
      const flightsCleanMatch = flightsHtmlNoComments.match(flightsCleanPattern);
      if (flightsCleanMatch) {
        const flightCount = parseInt(flightsCleanMatch[1]);
        console.log(`🔍 Regex captured flight count from top bar: ${flightCount}`);
        
        // Top bar ALWAYS shows all-time total, so always set totalFlights
        stats.totalFlights = flightCount;
        console.log('✅ Extracted totalFlights from top bar (all-time):', flightCount);
      }
    } else {
      console.log('⚠️ Could not find any div with class="stat" containing "Flights"');
      console.log('⚠️ Could not extract flights - trying to find ALL strong tags after Flights');
      // Last resort: find all numbers in strong tags after "Flights"
      const flightsContextPattern = /<p>Flights<\/p>([\s\S]{0,200})/i;
      const flightsContext = html.match(flightsContextPattern);
      if (flightsContext) {
        console.log('🔍 Content after <p>Flights</p>:', flightsContext[1].substring(0, 150));
        // Find all strong tags with numbers
        const strongPattern = /<strong>(\d+)<\/strong>/g;
        const matches = [...flightsContext[1].matchAll(strongPattern)];
        if (matches.length > 0) {
          // Take the last match (should be the actual value, not the commented one)
          const flightCount = parseInt(matches[matches.length - 1][1]);
          
          // Apply same logic as above
          if (rangeDays === 7) {
            stats.flightsLast7Days = flightCount;
            console.log('✅ Extracted flightsLast7Days (last strong tag):', flightCount);
          } else if (rangeDays === 30) {
            stats.flightsLast30Days = flightCount;
            console.log('✅ Extracted flightsLast30Days (last strong tag):', flightCount);
          } else if (rangeDays === 90) {
            stats.flightsLast90Days = flightCount;
            console.log('✅ Extracted flightsLast90Days (last strong tag):', flightCount);
          } else {
            stats.totalFlights = flightCount;
            console.log('✅ Extracted totalFlights (last strong tag):', flightCount);
          }
        }
      }
    }
    
    // Total Travelled Distance
    const distancePattern = /<div class="stat">\s*<p>Total Travelled Distance<\/p>\s*<strong>([^<]+)<\/strong>/i;
    const distanceMatch = html.match(distancePattern);
    if (distanceMatch) {
      stats.totalDistance = distanceMatch[1].trim();
      console.log('✅ Extracted Distance from top bar:', stats.totalDistance);
    }
    
    // Pattern 2: Extract from the circle containers - FLIGHTS
    // IMPORTANT: Circles show FILTERED data based on the selected period
    // So we need to set the appropriate period field based on rangeDays
    const shouldExtractFromCircles = rangeDays === 7 ? !stats.flightsLast7Days :
                                     rangeDays === 30 ? !stats.flightsLast30Days :
                                     rangeDays === 90 ? !stats.flightsLast90Days :
                                     false; // Don't extract from circles if no range
    
    console.log(`🔍 Pattern 2 check: rangeDays=${rangeDays}, shouldExtractFromCircles=${shouldExtractFromCircles}`);
    console.log(`   Current stats: flightsLast7Days=${stats.flightsLast7Days}, flightsLast30Days=${stats.flightsLast30Days}, flightsLast90Days=${stats.flightsLast90Days}`);
    
    if (shouldExtractFromCircles) {
      const flightsCirclePattern = /<div class="total">(\d+)<\/div>\s*<div class="category">FLIGHTS<\/div>/i;
      const flightsMatch = html.match(flightsCirclePattern);
      if (flightsMatch) {
        const flightCount = parseInt(flightsMatch[1]);
        console.log(`🔍 Circle pattern matched, extracted: ${flightCount}`);
        
        if (rangeDays === 7) {
          stats.flightsLast7Days = flightCount;
          console.log('✅ Extracted flightsLast7Days from circle (filtered):', flightCount);
        } else if (rangeDays === 30) {
          stats.flightsLast30Days = flightCount;
          console.log('✅ Extracted flightsLast30Days from circle (filtered):', flightCount);
        } else if (rangeDays === 90) {
          stats.flightsLast90Days = flightCount;
          console.log('✅ Extracted flightsLast90Days from circle (filtered):', flightCount);
        }
      } else {
        console.log('⚠️ Circle pattern did not match');
      }
    }
    
    // Pattern 2: Extract from the circle containers - DRONES
    const dronesCirclePattern = /<div class="total">(\d+)<\/div>\s*<div class="category">DRONES<\/div>/i;
    const dronesMatch = html.match(dronesCirclePattern);
    if (dronesMatch) {
      stats.totalAircraft = parseInt(dronesMatch[1]);
    }
    
    // Pattern 3: Extract purpose/project breakdown from JavaScript DataPoint declarations
    // Look for flightDataPoint variables (these are for purposes/projects)
    const flightDataPointPattern = /let flightDataPoint\d+ = new DataPoint\("([^"]+)",\s*(\d+),\s*\d+\);/gi;
    let flightMatch;
    const purposes = {};
    while ((flightMatch = flightDataPointPattern.exec(html)) !== null) {
      let name = flightMatch[1].trim();
      // Decode HTML entities like &amp; to &
      name = name.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      const count = parseInt(flightMatch[2]);
      if (count > 0) {
        purposes[name] = count;
      }
    }
    console.log(`🔍 Pattern 3 found ${Object.keys(purposes).length} purpose entries from flightDataPoint:`, purposes);
    if (Object.keys(purposes).length > 0) {
      stats.purposeBreakdown = purposes;
      console.log('✅ Set purposeBreakdown:', stats.purposeBreakdown);
    } else {
      console.log('⚠️ Pattern 3: Could not find flightDataPoint declarations');
    }
    
    // Pattern 4: Extract from JavaScript DataPoint declarations
    const dataPointPattern = /new DataPoint\("([^"]+)",\s*(\d+),\s*(\d+)\)/gi;
    let dataPointMatch;
    const dataPoints = {};
    while ((dataPointMatch = dataPointPattern.exec(html)) !== null) {
      const name = dataPointMatch[1].trim();
      const count = parseInt(dataPointMatch[2]);
      const total = parseInt(dataPointMatch[3]);
      
      if (name && count > 0) {  // Only include named, non-zero entries
        dataPoints[name] = count;
      }
      
      // Also capture the total if we haven't found it yet
      // Check which field to update based on rangeDays
      const needsTotal = rangeDays === 7 ? !stats.flightsLast7Days :
                         rangeDays === 30 ? !stats.flightsLast30Days :
                         rangeDays === 90 ? !stats.flightsLast90Days :
                         !stats.totalFlights;
      
      if (total > 0 && needsTotal) {
        if (rangeDays === 7) {
          stats.flightsLast7Days = total;
          console.log('✅ Extracted flightsLast7Days from DataPoint:', total);
        } else if (rangeDays === 30) {
          stats.flightsLast30Days = total;
          console.log('✅ Extracted flightsLast30Days from DataPoint:', total);
        } else if (rangeDays === 90) {
          stats.flightsLast90Days = total;
          console.log('✅ Extracted flightsLast90Days from DataPoint:', total);
        } else {
          stats.totalFlights = total;
          console.log('✅ Extracted totalFlights from DataPoint:', total);
        }
      }
    }
    if (Object.keys(dataPoints).length > 0 && !stats.purposeBreakdown) {
      stats.purposeBreakdown = dataPoints;
    }
    
    // Pattern 5: Extract hover subtitle
    const hoverSubtitlePattern = /<div class="hover-sub-title">Total\s+(\d+)\s+Flights<\/div>/i;
    const hoverMatch = html.match(hoverSubtitlePattern);
    if (hoverMatch) {
      const flightCount = parseInt(hoverMatch[1]);
      
      // Check which field needs to be updated
      const needsTotal = rangeDays === 7 ? !stats.flightsLast7Days :
                         rangeDays === 30 ? !stats.flightsLast30Days :
                         rangeDays === 90 ? !stats.flightsLast90Days :
                         !stats.totalFlights;
      
      if (needsTotal) {
        if (rangeDays === 7) {
          stats.flightsLast7Days = flightCount;
          console.log('✅ Extracted flightsLast7Days from hover subtitle:', flightCount);
        } else if (rangeDays === 30) {
          stats.flightsLast30Days = flightCount;
          console.log('✅ Extracted flightsLast30Days from hover subtitle:', flightCount);
        } else if (rangeDays === 90) {
          stats.flightsLast90Days = flightCount;
          console.log('✅ Extracted flightsLast90Days from hover subtitle:', flightCount);
        } else {
          stats.totalFlights = flightCount;
          console.log('✅ Extracted totalFlights from hover subtitle:', flightCount);
        }
      }
    }
    
    // Pattern 6: Extract projects count
    const projectsPattern = /<div class="hover-title">(\d+)\s+Projects?<\/div>/i;
    const projectsMatch = html.match(projectsPattern);
    if (projectsMatch) {
      stats.totalProjects = parseInt(projectsMatch[1]);
    }
    
    // Pattern 7: Extract header statistics from stats-container (removed - now in Pattern 1)
    
    // Pattern 8: Extract aircraft/drone breakdown from JavaScript DataPoint declarations
    // Look for droneDataPoint variables (these are for aircraft)
    const droneDataPointPattern = /let droneDataPoint\d+ = new DataPoint\("([^"]+)",\s*(\d+),\s*\d+\);/gi;
    let droneMatch;
    const drones = {};
    while ((droneMatch = droneDataPointPattern.exec(html)) !== null) {
      let name = droneMatch[1].trim();
      // Decode HTML entities like &amp; to &
      name = name.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      const count = parseInt(droneMatch[2]);
      if (count > 0) {
        drones[name] = count;
      }
    }
    console.log(`🔍 Pattern 8 found ${Object.keys(drones).length} aircraft entries from droneDataPoint:`, drones);
    if (Object.keys(drones).length > 0) {
      stats.aircraftBreakdown = drones;
      console.log('✅ Set aircraftBreakdown:', stats.aircraftBreakdown);
    } else {
      console.log('⚠️ Pattern 8: Could not find droneDataPoint declarations');
    }
    
    // Pattern 9: Look for 7-day period specific data
    const periodPatterns = [
      /(?:last\s+7\s+days?|past\s+week|this\s+week)[:\s]*(\d+)\s+flights?/i,
      /(\d+)\s+flights?\s+(?:in\s+)?(?:last\s+7\s+days?|past\s+week)/i,
    ];
    
    periodPatterns.forEach(pattern => {
      const match = html.match(pattern);
      if (match && !stats.flightsLast7Days) {
        stats.flightsLast7Days = parseInt(match[1]);
      }
    });
    
    // No fallback needed - top bar provides totalFlights, circles provide period-specific counts
    // if (!stats.flightsLast7Days && stats.totalFlights) {
    //   stats.flightsLast7Days = stats.totalFlights;
    //   console.log(`ℹ️ Using total flights as 7-day count: ${stats.flightsLast7Days}`);
    // }
    
    console.log('� Final extracted stats:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ Error extracting stats:', error.message);
    return {};
  }
}

function getClientWithJar(jar) {
  return got.extend({
    prefixUrl: SITE_ORIGIN,
    cookieJar: jar,
    followRedirect: false, // we want to inspect redirects
    throwHttpErrors: false
  });
}

// Helper: build page URL for endpoints that support pagination
// Try multiple common pagination patterns
function buildPageUrl(endpoint, page) {
  if (!endpoint || page === 1) return endpoint;
  
  // If endpoint already has query string
  if (endpoint.includes('?')) {
    // Try to replace existing pagination params
    if (endpoint.match(/[?&](page|p|pageNo)=\d+/)) {
      return endpoint.replace(/([?&](?:page|p|pageNo)=)\d+/, `$1${page}`);
    }
    // Try offset/start patterns (assuming 20 items per page)
    if (endpoint.match(/[?&](offset|start)=\d+/)) {
      const offset = (page - 1) * 20;
      return endpoint.replace(/([?&](?:offset|start)=)\d+/, `$1${offset}`);
    }
    return `${endpoint}&page=${page}`;
  }
  
  // No query string yet - try different pagination styles
  // Most sites use: ?page=2, ?p=2, or ?offset=20
  return `${endpoint}?page=${page}`;
}

function parseDateForComparison(dateStr) {
  try {
    if (!dateStr) return null;
    // dateStr may be '2025-10-24 13:14:36' or '10/24/2025 01:14 PM' or '2025-10-24'
    // Try to extract YYYY-MM-DD first
    const isoMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return new Date(isoMatch[1]);
    // Try MM/DD/YYYY
    const mdy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mdy) {
      const [_, mm, dd, yyyy] = mdy;
      return new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`);
    }
    // Fallback to Date constructor
    const d = new Date(dateStr);
    if (!isNaN(d)) return d;
    return null;
  } catch (e) {
    return null;
  }
}

// Fetch and aggregate paginated HTML pages from an endpoint until either
// (a) we reach maxPages, (b) no flights are returned on a page, or
// (c) ALL flights on a page are older than cutoffDate (so we can stop early)
async function fetchAndAggregateFromEndpoint(client, endpoint, cutoffDate, maxPages = 10) {
  const aggregated = [];
  const seenIds = new Set();
  let totalFetched = 0;
  let totalWithinPeriod = 0;

  console.log(`📅 Fetching flights newer than ${cutoffDate ? cutoffDate.toISOString().split('T')[0] : 'any date'}`);

  // Track first page IDs to detect if pagination is working
  let firstPageIds = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = buildPageUrl(endpoint, page);
    console.log(`🔁 Fetching page ${page} -> ${pageUrl}`);
    let r;
    try {
      r = await client.get(page === 1 ? endpoint : pageUrl);
    } catch (err) {
      console.log(`❌ Error fetching page ${page} for ${endpoint}:`, err.message);
      break;
    }

    if (!r || !r.body) {
      console.log(`⚠️ No response body from page ${page}, stopping`);
      break;
    }

    const body = r.body;
    const result = extractFlightDataFromHTML(body) || { flights: [], stats: null };
    const extracted = result.flights || [];
    totalFetched += extracted.length;
    console.log(`📦 Extracted ${extracted.length} flights from page ${page} (total so far: ${totalFetched})`);
    
    // Store stats from first page
    if (page === 1 && result.stats) {
      console.log('📊 Storing dashboard stats from page 1:', result.stats);
      aggregated._dashboardStats = result.stats;
    }

    if (extracted.length === 0) {
      console.log(`⛔ No flights found on page ${page}, stopping pagination`);
      break;
    }

    // On page 1, save IDs to detect if pagination is working
    if (page === 1) {
      extracted.forEach(f => firstPageIds.add(f.id));
    } else if (page === 2) {
      // Check if page 2 has the same flights as page 1 (pagination not working)
      const sameAsPage1 = extracted.every(f => firstPageIds.has(f.id));
      if (sameAsPage1 && extracted.length > 0) {
        console.log(`⚠️ Page 2 has identical flights to page 1 - pagination may not be working with ?page= param`);
        console.log(`📝 Trying alternative pagination patterns...`);
        
        // Try alternative URLs
        const alternatives = [
          endpoint.includes('?') ? `${endpoint}&p=${page}` : `${endpoint}?p=${page}`,
          endpoint.includes('?') ? `${endpoint}&offset=${(page-1)*20}` : `${endpoint}?offset=${(page-1)*20}`,
          endpoint.includes('?') ? `${endpoint}&start=${(page-1)*20}` : `${endpoint}?start=${(page-1)*20}`
        ];
        
        let foundWorking = false;
        for (const altUrl of alternatives) {
          try {
            console.log(`🔄 Trying alternative: ${altUrl}`);
            const altR = await client.get(altUrl);
            const altResult = extractFlightDataFromHTML(altR.body) || { flights: [] };
            const altExtracted = altResult.flights || [];
            const altSame = altExtracted.every(f => firstPageIds.has(f.id));
            if (!altSame && altExtracted.length > 0) {
              console.log(`✅ Found working pagination pattern: ${altUrl.includes('?p=') ? '?p=' : altUrl.includes('offset=') ? '?offset=' : '?start='}`);
              // Update the extracted array with the alternative result
              extracted.length = 0;
              extracted.push(...altExtracted);
              foundWorking = true;
              break;
            }
          } catch (e) {
            // Ignore errors on alternatives
          }
        }
        
        if (!foundWorking) {
          console.log(`❌ No working pagination pattern found - stopping at page 1`);
          console.log(`💡 Suggestion: Try using the flight list endpoint directly or check if the site has a "show all" option`);
          
          // Add a note to the final response about limited data
          aggregated.forEach(f => {
            if (!f.notes) f.notes = '';
            if (!f.notes.includes('Limited to first page')) {
              f.limitedData = true;
            }
          });
          break;
        }
      }
    }

    // Track how many flights from this page are within the period
    let flightsWithinPeriodOnPage = 0;
    let oldestDateOnPage = null;

    for (const f of extracted) {
      const id = f.id || `${f.date}_${f.aircraft}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      // Check if flight is within cutoffDate
      let include = true;
      if (cutoffDate) {
        const parsed = parseDateForComparison(f.date);
        if (parsed) {
          if (!oldestDateOnPage || parsed < oldestDateOnPage) oldestDateOnPage = parsed;
          if (parsed < cutoffDate) {
            include = false;
          } else {
            flightsWithinPeriodOnPage++;
          }
        }
      } else {
        flightsWithinPeriodOnPage++;
      }

      if (include) {
        aggregated.push(f);
        totalWithinPeriod++;
      }
    }

    console.log(`✅ Page ${page}: ${flightsWithinPeriodOnPage}/${extracted.length} flights within period (oldest: ${oldestDateOnPage ? oldestDateOnPage.toISOString().split('T')[0] : 'unknown'})`);

    // Smart stopping: if ALL flights on this page are older than cutoff, stop
    // This means we've gone past the period we care about
    if (cutoffDate && flightsWithinPeriodOnPage === 0 && oldestDateOnPage) {
      console.log(`⛔ All flights on page ${page} are older than cutoff (${oldestDateOnPage.toISOString().split('T')[0]} < ${cutoffDate.toISOString().split('T')[0]}), stopping pagination`);
      break;
    }

    // Also stop if we found very few flights within period on this page
    // (indicates we're moving out of the date range)
    if (cutoffDate && page > 1 && flightsWithinPeriodOnPage < extracted.length * 0.2) {
      console.log(`⛔ Less than 20% of flights on page ${page} are within period, likely past the date range`);
      break;
    }
  }

  console.log(`🎯 Aggregation complete: ${totalWithinPeriod} flights within period (fetched ${totalFetched} total across pages)`);
  console.log(`📊 Summary: Checked ${seenIds.size} unique flights, ${totalWithinPeriod} are within the ${cutoffDate ? Math.floor((new Date() - cutoffDate)/(1000*60*60*24)) + ' day period' : 'requested period'}`);
  return aggregated;
}

// Helper to fetch homepage and capture CSRF token from cookies or HTML
async function fetchCsrfAndJar() {
  const jar = new CookieJar();
  const client = getClientWithJar(jar);

  console.log('🌐 Getting homepage to extract CSRF token...');
  // GET homepage to receive cookies (CSRF token may be in cookie or in HTML)
  let res = await client.get(''); // Empty string instead of '/'
  let html = res.body || '';
  
  console.log('📊 Homepage response:', { 
    status: res.statusCode, 
    bodyLength: html.length,
    location: res.headers.location,
    hasLoginForm: html.includes('login') || html.includes('email')
  });

  // If we get redirected, follow the redirect to get the actual page
  if (res.statusCode === 302 && res.headers.location) {
    console.log('🔄 Following redirect to:', res.headers.location);
    
    // Build the full URL for the redirect
    let redirectUrl = res.headers.location;
    if (redirectUrl.startsWith('/')) {
      redirectUrl = redirectUrl.substring(1); // Remove leading slash for got
    }
    
    res = await client.get(redirectUrl);
    html = res.body || '';
    
    console.log('📊 Redirected page response:', { 
      status: res.statusCode, 
      bodyLength: html.length,
      hasLoginForm: html.includes('login') || html.includes('email') || html.includes('password')
    });
  }

  // Try to get CSRF token from cookie first (check multiple cookie names)
  const cookies = await jar.getCookies(SITE_ORIGIN + '/');
  console.log('🍪 Cookies received:', cookies.map(c => ({ name: c.key, value: c.value.substring(0, 20) + '...' })));
  
  const csrfCookie = cookies.find(c => 
    c.key && (
      c.key.toLowerCase().includes('csrf') || 
      c.key.toLowerCase().includes('token') ||
      c.key === 'CSRF_Sec_Token'
    )
  );
  let csrf = csrfCookie ? csrfCookie.value : null;

  // Also check if any cookie contains what looks like a CSRF token
  if (!csrf) {
    for (const cookie of cookies) {
      if (cookie.value && /^[a-f0-9]{32,}$/i.test(cookie.value)) {
        console.log(`🎯 Found token-like value in cookie ${cookie.key}:`, cookie.value.substring(0, 8) + '...');
        csrf = cookie.value;
        break;
      }
    }
  }

  // If not found, try to parse from HTML hidden input
  if (!csrf) {
    console.log('🔍 Searching for CSRF token in HTML...');
    
    // Try multiple patterns for CSRF token
    const patterns = [
      /name=["']CSRF_Sec_Token["']\s+value=["']([a-f0-9]+)["']/i,
      /value=["']([a-f0-9]+)["']\s+name=["']CSRF_Sec_Token["']/i,
      /<input[^>]*name=["']csrf[^"']*["'][^>]*value=["']([^"']+)["']/i,
      /<input[^>]*value=["']([a-f0-9]{32,})["'][^>]*name=["']csrf/i
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        csrf = match[1];
        console.log('✅ CSRF token found in HTML:', csrf.substring(0, 8) + '...');
        break;
      }
    }
    
    if (!csrf) {
      console.log('⚠️ No CSRF token found. Dumping first 1000 chars of HTML:');
      console.log(html.substring(0, 1000));
      
      // Let's also check if there's a login form and try a different approach
      if (html.includes('login') || html.includes('password')) {
        console.log('📝 Found login-related content, but no CSRF token. Proceeding without CSRF...');
      }
    }
  } else {
    console.log('✅ CSRF token found in cookie:', csrf.substring(0, 8) + '...');
  }

  return { jar, csrf, html, res };
}

// Try posting to dashboard.php with several likely form payloads (e.g. Last 30 days)
async function postDashboardWithRange(jar, csrf, rangeDays) {
  const client = getClientWithJar(jar);
  
  // Map rangeDays to the correct flightFilterPeriod value
  let filterPeriod;
  if (rangeDays === 7) {
    filterPeriod = 'SHORT';
  } else if (rangeDays === 30) {
    filterPeriod = 'MEDIUM';
  } else if (rangeDays === 90) {
    filterPeriod = 'LONG';
  } else {
    console.log('⚠️ Unknown range days:', rangeDays);
    return { res: null, html: '' };
  }
  
  // The actual payload structure from DroneLogBook
  const payload = {
    action: 'menu',
    flightBlock: '',
    viewUserOnlyFigures: '',
    viewTotalYearFigures: '',
    flightFilterPeriod: filterPeriod
  };
  
  if (csrf) {
    payload.CSRF_Sec_Token = csrf;
  }
  
  try {
    const body = querystring.stringify(payload);
    console.log(`📤 Posting to dashboard.php with flightFilterPeriod=${filterPeriod} (${rangeDays} days)`);
    console.log(`   Body: ${body}`);
    
    const r = await client.post('dashboard.php', {
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': SITE_ORIGIN + '/dashboard.php',
        'Origin': SITE_ORIGIN,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const html = r.body || '';
    console.log(`📦 dashboard POST response: status=${r.statusCode}, length=${html.length}`);

    // Check if we got valid dashboard content (stats + chart data)
    const hasStats = /total.{0,20}flights?/i.test(html) || /flights?.{0,20}total/i.test(html);
    const hasChart = /CanvasJS\.Chart/.test(html) || /chartContainer1/.test(html) || /dataPoints/.test(html);
    
    if (hasStats && hasChart) {
      console.log(`✅✅✅ SUCCESS! Dashboard HTML with stats AND chart data using flightFilterPeriod=${filterPeriod} ✅✅✅`);
      return { res: r, html };
    } else if (hasStats || hasChart) {
      console.log(`⚠️ Partial match: hasStats=${hasStats}, hasChart=${hasChart}`);
      return { res: r, html }; // Return anyway, might be enough
    } else {
      console.log('⚠️ Response does not contain expected dashboard content');
      return { res: null, html: '' };
    }
  } catch (err) {
    console.log(`❌ Error posting dashboard with flightFilterPeriod=${filterPeriod}:`, err.message);
    return { res: null, html: '' };
  }
}

// Support both /api/login and /api/auth/login for compatibility
app.post(['/api/login', '/api/auth/login'], async (req, res) => {
  try {
    console.log('🔐 Received login request:', { email: req.body.email });
    
    const { email, password } = req.body;
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ error: 'email and password required' });
    }

    console.log('📡 Step 1: Fetching homepage to get CSRF token...');
    // 1) GET homepage to obtain session cookie and CSRF token
    let { jar, csrf } = await fetchCsrfAndJar();
    
    // If no CSRF token found, try getting it from the login page directly
    if (!csrf) {
      console.log('🔄 No CSRF on homepage, trying login page directly...');
      const client = getClientWithJar(jar);
      const loginPageRes = await client.get('profile/login.php');
      const loginHtml = loginPageRes.body || '';
      
      console.log('📊 Login page response:', { 
        status: loginPageRes.statusCode, 
        bodyLength: loginHtml.length 
      });
      
      // Try to extract CSRF from login page with more comprehensive search
      const patterns = [
        /name=["']CSRF_Sec_Token["']\s+value=["']([a-f0-9]+)["']/i,
        /value=["']([a-f0-9]+)["']\s+name=["']CSRF_Sec_Token["']/i,
        /CSRF_Sec_Token["'][^>]*value=["']([a-f0-9]+)["']/i,
        /"CSRF_Sec_Token"[^}]*"([a-f0-9]{32,})"/i,
        /csrf[^"']*["']([a-f0-9]{32,})["']/i
      ];
      
      for (const pattern of patterns) {
        const match = loginHtml.match(pattern);
        if (match) {
          csrf = match[1];
          console.log('✅ CSRF token found on login page:', csrf.substring(0, 8) + '...');
          break;
        }
      }
      
      // If still no CSRF, let's look for any form inputs or JavaScript variables
      if (!csrf) {
        console.log('🔍 Searching for any token-like patterns...');
        
        // Look for any 32+ character hex strings that might be tokens
        const tokenMatches = loginHtml.match(/[a-f0-9]{32,}/gi);
        if (tokenMatches && tokenMatches.length > 0) {
          console.log('🎯 Found potential tokens:', tokenMatches.slice(0, 3));
          // Use the first one as CSRF token
          csrf = tokenMatches[0];
          console.log('✅ Using first token as CSRF:', csrf.substring(0, 8) + '...');
        } else {
          console.log('⚠️ Still no CSRF token. Full login page content:');
          console.log('--- LOGIN PAGE START ---');
          console.log(loginHtml);
          console.log('--- LOGIN PAGE END ---');
        }
      }
    }
    
    console.log('✅ CSRF token obtained:', csrf ? csrf.substring(0, 8) + '...' : 'none');

    // 2) Build form payload. Match the browser form fields you captured.
    const form = {
      CSRF_Sec_Token: csrf || '',
      action: 'ACTION_LOGIN',
      organisationToken: '',
      plan: '',
      redirect: '',
      email,
      password,
      twofaCode: '',
      passwordConfirm: '',
      userCountry: 'US',
      userLanguage: 'en'
    };

    console.log('📝 Form data prepared:', { ...form, password: '***hidden***' });

    const client = getClientWithJar(jar);

    console.log('📤 Step 2: Posting login form to dronelogbook.com...');
    // 3) POST to profile/login.php as form-urlencoded
    const post = await client.post('profile/login.php', {
      body: querystring.stringify(form),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': SITE_ORIGIN + '/'
      }
    });

    console.log('📦 Login response:', {
      status: post.statusCode,
      location: post.headers.location,
      bodyLength: post.body ? post.body.length : 0
    });

    // The site responds 302 Found to /dashboard.php on success
    if (post.statusCode === 302 && post.headers.location && post.headers.location.includes('dashboard.php')) {
      console.log('✅ Login successful! Redirected to dashboard');
      // Save cookieJar in session for subsequent proxied requests
      req.session.cookieJarSerialized = await jar.serialize();
      // also mark authenticated flag
      req.session.authenticated = true;
      return res.json({ success: true, message: 'Logged in and session saved on proxy.' });
    }

    // If login not successful, try to read response body for message
    const bodyText = post.body || '';
    console.log('❌ Login failed. Response body preview:', bodyText.substring(0, 500));
    
    // Check for common error patterns in the response
    let errorMessage = 'Login failed';
    if (bodyText.includes('Invalid') || bodyText.includes('incorrect')) {
      errorMessage = 'Invalid email or password';
    } else if (bodyText.includes('suspended') || bodyText.includes('blocked')) {
      errorMessage = 'Account suspended or blocked';
    } else if (bodyText.includes('verification') || bodyText.includes('verify')) {
      errorMessage = 'Email verification required';
    }
    
    return res.status(401).json({ 
      success: false, 
      error: errorMessage,
      status: post.statusCode, 
      details: bodyText.slice(0, 1000) 
    });
  } catch (err) {
    console.error('💥 Proxy login error:', err);
    res.status(500).json({ error: 'Proxy login failed', details: err.message });
  }
});

// Example proxied endpoint to fetch flights using saved session
app.get('/api/flights', async (req, res) => {
  try {
    console.log('✈️ Fetching flights data...');
    
    if (!req.session || !req.session.cookieJarSerialized) {
      return res.status(401).json({ error: 'Not authenticated via proxy. Please /api/login first.' });
    }

    const jar = await CookieJar.deserialize(req.session.cookieJarSerialized);
    const client = getClientWithJar(jar);

    let flightData = null;

    try {
      // Fetch dashboard.php - it contains all the stats we need
      console.log('🔍 Fetching dashboard.php...');

      // Allow optional query param to request a specific range (e.g. ?range=30 for Last 30 days)
      const rangeDays = parseInt(req.query.range || req.query.days || req.query.period || '0', 10) || 0;
      let r;
      let dashboardHtml = '';
      
      if (rangeDays > 0) {
        console.log(`🔁 Attempting POST dashboard with range=${rangeDays} days`);
        // Try to extract CSRF token from existing jar cookies
        const cookies = await jar.getCookies(SITE_ORIGIN + '/');
        const csrfCookie = cookies.find(c => c.key && (c.key.toLowerCase().includes('csrf') || c.key.toLowerCase().includes('token') || c.key === 'CSRF_Sec_Token'));
        const csrf = csrfCookie ? csrfCookie.value : null;
        
        if (csrf) {
          console.log(`✅ Using CSRF token: ${csrf.substring(0, 8)}...`);
        } else {
          console.log('⚠️ No CSRF token found in cookies, attempting POST without it');
        }

        const posted = await postDashboardWithRange(jar, csrf, rangeDays);
        if (posted && posted.res && posted.html && posted.html.length > 0) {
          console.log(`✅ POST successful, using filtered dashboard data (${posted.html.length} bytes)`);
          r = posted.res;
          dashboardHtml = posted.html;
        } else {
          console.log('ℹ️ POST did not return complete dashboard HTML, falling back to GET');
          r = await client.get('dashboard.php');
          dashboardHtml = r.body || '';
        }
      } else {
        console.log('📥 Using GET dashboard.php (no range filter)');
        r = await client.get('dashboard.php');
        dashboardHtml = r.body || '';
      }

      if (r && r.statusCode >= 200 && r.statusCode < 300) {
        const body = dashboardHtml;
        console.log(`✅ Dashboard returned ${r.statusCode}, body length: ${body.length}`);

        // Extract stats and flights from dashboard HTML
        console.log('� Parsing HTML...');
        const result = extractFlightDataFromHTML(body, rangeDays);
        const extractedFlights = result?.flights || [];
        const extractedStats = result?.stats || null;
        
        // Success if we got flights OR complete stats
        const hasCompleteStats = extractedStats && extractedStats.totalFlights && extractedStats.flyingTime && extractedStats.totalDistance;
        const hasFlights = extractedFlights && extractedFlights.length > 0;
        
        if (hasFlights || hasCompleteStats) {
          if (hasFlights) {
            console.log(`✅ Extracted ${extractedFlights.length} flights`);
          }
          if (hasCompleteStats) {
            console.log(`📊 Found complete dashboard stats:`, extractedStats);
          }
          
          flightData = { 
            success: true, 
            flights: extractedFlights, 
            stats: extractedStats,
            total: extractedStats?.totalFlights || extractedFlights.length, 
            page: 1, 
            message: hasCompleteStats ? 'Dashboard statistics (instant load)' : 'Flight data from dashboard' 
          };
        }
      }
    } catch (err) {
      console.log(`❌ Failed to fetch dashboard:`, err.message);
    }
    
    if (flightData) {
      console.log(`✅ Returning flight data with ${flightData.flights?.length || 0} flights`);
      return res.json(flightData);
    } else {
      console.log('❌ No flight data found');
      return res.status(404).json({ 
        error: 'No flight data found',
        message: 'Could not extract data from dashboard. Please verify you are logged in correctly.'
      });
    }
  } catch (err) {
    console.error('Proxy flights error:', err);
    res.status(500).json({ error: 'Proxy fetch flights failed', details: err.message });
  }
});

// Add statistics endpoint
app.get('/api/statistics', async (req, res) => {
  try {
    console.log('📊 Fetching statistics/metrics...');
    
    if (!req.session || !req.session.cookieJarSerialized) {
      return res.status(401).json({ error: 'Not authenticated via proxy. Please /api/login first.' });
    }

    const jar = await CookieJar.deserialize(req.session.cookieJarSerialized);
    const client = getClientWithJar(jar);

    const periodDays = parseInt(req.query.periodDays || req.query.period || '7', 10) || 7;
    console.log(`📊 Fetching stats for last ${periodDays} days`);

    // Try endpoints that might return summary/statistics
    const statsEndpoints = [
      'api/statistics',
      'api/stats',
      'api/dashboard/summary',
      'dashboard/statsAjax.php',
      'dashboard/stats.php',
      'statistics.php',
      'stats.php',
      'api/summary',
      'flight/statistics.php',
      'flight/stats.php',
      'dashboardAjax.php?action=getStats',
      'dashboardAjax.php?action=getSummary'
    ];

    for (const endpoint of statsEndpoints) {
      try {
        console.log(`🔍 Trying stats endpoint: ${endpoint}`);
        
        // Try both GET and POST
        let r;
        const isAjax = endpoint.includes('Ajax') || endpoint.includes('ajax');
        
        if (isAjax) {
          // Try POST with various parameters
          const postData = {
            action: endpoint.includes('getStats') ? 'getStats' : 'getSummary',
            period: periodDays,
            days: periodDays,
            from: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0]
          };
          
          try {
            r = await client.post(endpoint.split('?')[0], {
              body: querystring.stringify(postData),
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
              }
            });
          } catch (postErr) {
            r = await client.get(endpoint);
          }
        } else {
          // Try GET with period parameter
          const urlWithPeriod = endpoint.includes('?') 
            ? `${endpoint}&days=${periodDays}` 
            : `${endpoint}?days=${periodDays}`;
          r = await client.get(urlWithPeriod);
        }

        if (r && r.statusCode >= 200 && r.statusCode < 300 && r.body) {
          console.log(`✅ ${endpoint} returned ${r.statusCode}, body length: ${r.body.length}`);
          
          // Try to parse as JSON
          try {
            const data = JSON.parse(r.body);
            console.log(`📊 JSON stats data keys:`, Object.keys(data));
            
            // Check if it looks like statistics
            if (data.statistics || data.stats || data.summary || 
                data.totalFlights !== undefined || data.total_flights !== undefined ||
                data.flightCount !== undefined || data.flight_count !== undefined) {
              console.log(`✅ Found statistics data at ${endpoint}`);
              return res.json({ success: true, data, source: endpoint });
            }
          } catch (e) {
            // Not JSON or doesn't contain stats
            console.log(`⚠️ ${endpoint} didn't return valid stats JSON`);
          }
        }
      } catch (err) {
        console.log(`❌ Failed ${endpoint}:`, err.message);
      }
    }

    // If no dedicated stats endpoint found, return 404
    console.log('❌ No statistics endpoint found');
    return res.status(404).json({ 
      error: 'No statistics endpoint found',
      message: 'No dedicated statistics API found. You may need to calculate stats from flight list.',
      suggestion: 'Try using /api/flights and calculating stats client-side'
    });
    
  } catch (err) {
    console.error('Proxy statistics error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics', details: err.message });
  }
});

app.post(['/api/logout', '/api/auth/logout'], async (req, res) => {
  try {
    console.log('👋 Logging out...');
    
    if (req.session && req.session.cookieJarSerialized) {
      const jar = await CookieJar.deserialize(req.session.cookieJarSerialized);
      const client = getClientWithJar(jar);
      
      // Try to logout on the actual site
      try {
        await client.post('profile/logout.php');
      } catch (err) {
        console.log('⚠️ Site logout failed:', err.message);
      }
    }
    
    // Clear session
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed', details: err.message });
  }
});

// Add profile endpoint (support both paths)
app.get(['/api/profile', '/api/auth/profile'], async (req, res) => {
  try {
    if (!req.session || !req.session.authenticated) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Return basic profile info
    res.json({
      email: 'flightdev@airbound.co', // You could extract this from the session
      name: 'Flight Developer',
      authenticated: true
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Profile fetch failed', details: err.message });
  }
});

// Debug endpoint to save dashboard HTML for inspection
app.get('/api/debug/dashboard-html', async (req, res) => {
  try {
    if (!req.session || !req.session.cookieJarSerialized) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const jar = await CookieJar.deserialize(req.session.cookieJarSerialized);
    const client = getClientWithJar(jar);
    
    console.log('📥 Fetching dashboard.php for inspection...');
    const r = await client.get('dashboard.php');
    
    if (r && r.body) {
      const fs = require('fs');
      const path = require('path');
      const debugPath = path.join(__dirname, 'debug-dashboard.html');
      
      fs.writeFileSync(debugPath, r.body, 'utf8');
      console.log(`✅ Saved dashboard HTML to: ${debugPath}`);
      
      // Also extract and return stats
      const result = extractFlightDataFromHTML(r.body);
      
      return res.json({
        success: true,
        savedTo: debugPath,
        htmlLength: r.body.length,
        extractedStats: result.stats,
        flightCount: result.flights?.length || 0,
        message: 'Dashboard HTML saved for inspection'
      });
    }
    
    res.status(404).json({ error: 'Could not fetch dashboard' });
  } catch (err) {
    console.error('Debug endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Auth proxy listening on http://localhost:${PORT}`));