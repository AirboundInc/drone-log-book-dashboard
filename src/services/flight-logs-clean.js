/**
 * Flight Logs Service
 * Handles fetching flight logs for a drone from Drone Logbook API
 */

/**
 * Fetch flight logs for a specific drone
 * @param {string} droneId - The drone UUID
 * @returns {Promise<Array>} Array of flight objects
 */
export async function fetchFlightLogsForDrone(droneId) {
  if (!droneId) {
    throw new Error('Drone ID is required')
  }

  try {
    console.log(`📝 Fetching flight logs for drone: ${droneId}`)
    
    const response = await fetch(`/api/drones/detail?id=${encodeURIComponent(droneId)}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch drone detail: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    console.log(`📄 Received HTML, length: ${html.length}`)

    const result = parseFlightsFromHTML(html)
    console.log(`🎯 Found ${result.flights.length} flights`)
    
    return result.flights
  } catch (err) {
    console.error('❌ Error fetching flight logs:', err)
    throw new Error(`Failed to fetch flight logs: ${err.message}`)
  }
}

export function parseFlightsFromHTML(html) {
  const flights = []
  const seenIds = new Set()

  console.log('🔍 Starting flight parsing...')

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    // Find all flight links
    const flightLinks = doc.querySelectorAll('a[href*="/flight/flightDetail.php?id="]')
    console.log(`Found ${flightLinks.length} flight links`)
    
    flightLinks.forEach((link, index) => {
      const href = link.getAttribute('href') || ''
      const match = href.match(/id=([A-F0-9\-]+)/i)
      
      if (match && match[1] && !seenIds.has(match[1])) {
        const flightId = match[1]
        let flightName = ''
        let duration = ''
        let date = ''
        let time = ''
        let pilot = ''
        
        console.log(`\n📍 Flight ${index + 1}: ${flightId}`)
        
        // Walk up the DOM to find a container with the metadata
        let container = link.parentElement
        let level = 0
        let found = false
        
        while (container && level < 10 && !found) {
          const text = (container.innerText || container.textContent || '').trim()
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
          
          if (lines.length >= 1) {
            const firstLine = lines[0]
            
            // Check if this looks like flight metadata
            if (firstLine.match(/\d{4}-\d{2}-\d{2}/) || firstLine.match(/^\[?\d+\]?/) || firstLine.includes('Flight')) {
              console.log(`  ✓ Found metadata at level ${level}`)
              
              // Extract name, duration, date, time, pilot
              const nameMatch = firstLine.match(/Flight\s+([\d\-]+)\s+([\d:]+)/)
              if (nameMatch) {
                date = nameMatch[1]
                time = nameMatch[2]
                flightName = `Flight ${date} ${time}`
              }
              
              // Duration might be at the end
              const durationMatch = firstLine.match(/([\d:]+)$/)
              if (durationMatch) {
                const lastToken = durationMatch[1]
                if (lastToken.match(/^\d{2}:\d{2}:\d{2}$/)) {
                  duration = lastToken
                }
              }
              
              // Pilot from second line
              if (lines.length > 1) {
                const secondLine = lines[1]
                const pilotMatch = secondLine.match(/Pilot:\s*(.+)/)
                if (pilotMatch) {
                  pilot = pilotMatch[1].trim()
                } else {
                  pilot = secondLine.replace(/^\d{4}-\d{2}-\d{2}/, '').replace(/\d{2}:\d{2}:\d{2}/, '').trim()
                }
              }
              
              if (flightName) {
                found = true
              }
            }
          }
          
          container = container.parentElement
          level++
        }
        
        // Fallback
        if (!flightName || flightName.length < 3) {
          flightName = `Flight ${flightId.substring(0, 8)}`
        }
        
        flights.push({
          id: flightId,
          name: flightName,
          duration: duration,
          date: date,
          time: time,
          pilot: pilot,
          url: href
        })
        
        seenIds.add(flightId)
      }
    })
    
    console.log(`✅ Found ${flights.length} total flights`)
  } catch (err) {
    console.warn('❌ DOMParser failed:', err.message)
  }

  if (flights.length === 0) {
    console.warn('⚠️ No flights found')
  }

  return {
    flights,
    hasNextPage: false,
    paginationValue: ''
  }
}

/**
 * Get the Drone Logbook URL for a specific flight
 * @param {string} flightId - Flight UUID
 * @returns {string} Flight detail URL
 */
export function getFlightDetailUrl(flightId) {
  return `https://www.dronelogbook.com/flight/flightDetail.php?id=${flightId}`
}
