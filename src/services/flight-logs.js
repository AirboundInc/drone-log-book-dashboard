/**
 * Flight Logs Service
 * Handles fetching flight logs for a drone from Drone Logbook API
 * Server-side pagination with Drone Logbook
 */

/**
 * Fetch ALL flight logs for a drone from all pages (progressive loading)
 * @param {string} droneId - The drone UUID
 * @param {Function} onPageLoaded - Callback when each page loads: (flights, pageNum) => void
 * @returns {Promise<void>}
 */
export async function fetchAllFlightLogs(droneId, onPageLoaded) {
  if (!droneId) {
    throw new Error('Drone ID is required')
  }

  console.log(`📝 Fetching ALL flight logs for drone: ${droneId}`)

  const url = `/api/drones/all-flights?id=${encodeURIComponent(droneId)}`
  const eventSource = new EventSource(url)

  return new Promise((resolve, reject) => {
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.error) {
          console.error('❌ Error from server:', data.error)
          eventSource.close()
          reject(new Error(data.error))
          return
        }

        if (data.done) {
          console.log(`✅ All pages loaded (${data.totalPages} pages)`)
          eventSource.close()
          resolve()
          return
        }

        if (data.html) {
          console.log(`📄 Processing page ${data.page}...`)
          const result = parseFlightsFromHTML(data.html)
          console.log(`✅ Found ${result.flights.length} flights on page ${data.page}`)
          
          // Call the callback with the flights from this page
          onPageLoaded(result.flights, data.page)
        }
      } catch (err) {
        console.error('❌ Error processing server event:', err)
        eventSource.close()
        reject(err)
      }
    }

    eventSource.onerror = (error) => {
      console.error('❌ EventSource error:', error)
      eventSource.close()
      reject(new Error('Failed to fetch flights'))
    }
  })
}

/**
 * Fetch flight logs for a specific drone from a specific page
 * @param {string} droneId - The drone UUID
 * @param {number} pageNumber - The page number (defaults to 1)
 * @returns {Promise<Object>} Object with { flights: Array, hasNextPage: Boolean }
 */
export async function fetchFlightLogsForDrone(droneId, pageNumber = 1) {
  if (!droneId) {
    throw new Error('Drone ID is required')
  }

  try {
    console.log(`📝 Fetching flight logs for drone: ${droneId}, page: ${pageNumber}`)
    
    // Use GET endpoint with page parameter
    const url = `/api/drones/detail-page?droneId=${encodeURIComponent(droneId)}&pageNumber=${pageNumber}`;
    console.log(`📥 Using GET endpoint: ${url}`)
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch drone detail: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    console.log(`📄 Received HTML, length: ${html.length}`)

    // Parse flights from this page's HTML
    const result = parseFlightsFromHTML(html)
    console.log(`🎯 Found ${result.flights.length} flights on page ${pageNumber}`)
    console.log(`📄 Has next page: ${result.hasNextPage}`)
    
    return result
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

    // Check for next page button or pagination indicator
    // Look for navigation links or buttons that indicate more pages
    const hasNextButton = doc.querySelector('a[href*="flightPagination"], button[onclick*="flightPagination"]')
    const hasNextIndicator = doc.body.textContent.includes('Next') || doc.body.textContent.includes('next page')
    const hasNextPage = !!(flights.length > 0 && (hasNextButton || hasNextIndicator))
    
    console.log(`📄 Has next page detected: ${hasNextPage} (button: ${!!hasNextButton}, indicator: ${hasNextIndicator})`)
    
    if (flights.length === 0) {
      console.warn('⚠️ No flights found')
    }

    return {
      flights,
      hasNextPage: hasNextPage,
      paginationValue: ''
    }
  } catch (err) {
    console.warn('❌ DOMParser failed:', err.message)
    return {
      flights,
      hasNextPage: false,
      paginationValue: ''
    }
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
