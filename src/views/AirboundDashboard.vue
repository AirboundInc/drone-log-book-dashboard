<template>
  <div class="dashboard-container">
    <!-- Header Card -->
    <div class="header-card">
      <div class="header-content">
        <div class="header-left">
          <h1 class="company-name">Airbound</h1>
        </div>
        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-label">Flying Time</div>
            <div class="stat-value">{{ stats.totalFlightTime }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Flights</div>
            <div class="stat-value">{{ stats.totalFlights }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Distance</div>
            <div class="stat-value">{{ stats.totalDistance }} km</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content-wrapper">
      <h2 class="section-title">Flights</h2>

      <!-- Charts Grid -->
      <div class="charts-grid">
        <!-- Pie Charts Card -->
        <div class="card pie-charts-card">
          <div class="card-header">
            <h3 class="card-title">Breakdown</h3>
          </div>
          <div class="card-body">
            <div class="charts-horizontal">
              <!-- Purpose Breakdown Pie Chart -->
              <div class="chart-item">
                <h4 class="chart-subtitle">Flights</h4>
                <div class="purpose-pie-chart">
                  <svg viewBox="0 0 200 200" class="pie-svg">
                    <g v-if="purposeSegments && purposeSegments.length > 0" transform="translate(100, 100)">
                      <path
                        v-for="(segment, index) in purposeSegments"
                        :key="segment.purpose"
                        :d="segment.path"
                        :fill="segment.color"
                        class="pie-segment"
                      >
                        <title>{{ segment.purpose }}: {{ segment.count }} ({{ segment.percentage }}%)</title>
                      </path>
                      <circle r="60" fill="white" />
                    </g>
                    <g v-else transform="translate(100, 100)">
                      <circle r="90" fill="#e0e0e0" />
                      <circle r="60" fill="white" />
                    </g>
                    <text x="100" y="95" text-anchor="middle" class="pie-center-number">{{ recentStats.recentFlights }}</text>
                    <text x="100" y="110" text-anchor="middle" class="pie-center-label">FLIGHTS</text>
                  </svg>
                  <div v-if="purposeSegments && purposeSegments.length > 0" class="pie-legend">
                    <div v-for="segment in purposeSegments" :key="segment.purpose" class="legend-item-pie">
                      <span class="legend-color-box" :style="{ backgroundColor: segment.color }"></span>
                      <span class="legend-text">{{ segment.purpose }}: {{ segment.count }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Drones/Aircraft Breakdown Chart -->
              <div class="chart-item">
                <h4 class="chart-subtitle">Drones</h4>
                <div class="purpose-pie-chart">
                  <svg viewBox="0 0 200 200" class="pie-svg">
                    <g v-if="aircraftSegments && aircraftSegments.length > 0" transform="translate(100, 100)">
                      <path
                        v-for="(segment, index) in aircraftSegments"
                        :key="segment.aircraft"
                        :d="segment.path"
                        :fill="segment.color"
                        class="pie-segment"
                      >
                        <title>{{ segment.aircraft }}: {{ segment.count }} flights ({{ segment.percentage }}%)</title>
                      </path>
                      <circle r="60" fill="white" />
                    </g>
                    <g v-else transform="translate(100, 100)">
                      <circle r="90" fill="#e0e0e0" />
                      <circle r="60" fill="white" />
                    </g>
                    <text x="100" y="95" text-anchor="middle" class="pie-center-number">{{ recentStats.activeDrones }}</text>
                    <text x="100" y="110" text-anchor="middle" class="pie-center-label">DRONES</text>
                  </svg>
                  <div v-if="aircraftSegments && aircraftSegments.length > 0" class="pie-legend">
                    <div v-for="segment in aircraftSegments" :key="segment.aircraft" class="legend-item-pie">
                      <span class="legend-color-box" :style="{ backgroundColor: segment.color }"></span>
                      <span class="legend-text">{{ segment.aircraft }}: {{ segment.count }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Period Selector Card -->
        <div class="card period-card">
          <div class="card-header">
            <h3 class="card-title">Time Period</h3>
          </div>
          <div class="card-body">
            <div class="period-buttons">
              <button 
                v-for="period in timePeriods" 
                :key="period.value"
                class="btn period-btn"
                :class="{ active: selectedPeriod === period.value }"
                @click="() => { console.log('🔘 Period button clicked:', period.label, period.value); selectedPeriod = period.value }"
              >
                {{ period.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Bar Chart Card -->
        <div class="card chart-card">
          <div class="card-header">
            <h3 class="card-title">Activity Over Time</h3>
            <div class="chart-legend">
              <span class="legend-item">
                <span class="legend-color flying-time"></span>
                Flying Time (min)
              </span>
              <span class="legend-item">
                <span class="legend-color flight-count"></span>
                Flight #
              </span>
            </div>
          </div>
          <div class="card-body">
            <div class="bar-chart">
              <div class="chart-grid">
                <div class="grid-line"></div>
                <div class="grid-line"></div>
                <div class="grid-line"></div>
              </div>
              <div class="chart-bars">
                <div v-for="month in chartData" :key="month.label" class="bar-group" 
                     :title="`${month.label}\nFlying Time: ${month.tooltip}\nFlights: ${month.flightCount}`">
                  <div class="bar flying-time-bar" 
                       :style="{ height: month.flyingTimeHeight + '%' }"
                       :data-value="month.flyingTime"></div>
                  <div class="bar flight-count-bar" 
                       :style="{ height: month.flightCountHeight + '%' }"
                       :data-value="month.flightCount"></div>
                </div>
              </div>
              <div class="chart-x-labels">
                <div v-for="month in chartData" :key="'label-' + month.label" class="x-label">
                  {{ month.label }}
                </div>
              </div>
              <div class="chart-y-axis">
                <div class="y-axis-left">
                  <div>{{ Math.round(maxFlyingTime) }}</div>
                  <div>{{ Math.round(maxFlyingTime / 2) }}</div>
                  <div>0</div>
                </div>
                <div class="y-axis-right">
                  <div>{{ maxFlightCount }}</div>
                  <div>{{ Math.round(maxFlightCount / 2) }}</div>
                  <div>0</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Flights Card -->
      <div class="card flights-card">
        <div class="card-header">
          <h3 class="card-title">Latest Flights ({{ filteredFlights.length }})</h3>
          <button class="btn btn-dark">View All</button>
        </div>
        <div class="card-body">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="text-muted mt-2">Loading flight data from Dronelogbook...</p>
          </div>

          <div v-else-if="flights.length === 0" class="text-center py-5">
            <i class="fas fa-plane fa-3x text-muted mb-3"></i>
            <h5>No flights found</h5>
            <p class="text-muted">Start by adding your first flight to the logbook.</p>
          </div>

          <div v-else class="table-responsive">
            <table class="table flights-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Aircraft</th>
                  <th>Duration</th>
                  <th>Location</th>
                  <th>Purpose</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="flight in filteredFlights" :key="flight.id" class="flight-row">
                  <td>{{ formatDate(flight.date) }}</td>
                  <td>
                    <div class="aircraft-info">
                      <i class="fas fa-helicopter me-2 text-primary"></i>
                      {{ flight.aircraft }}
                    </div>
                  </td>
                  <td>{{ flight.duration }}</td>
                  <td>{{ flight.location }}</td>
                  <td>
                    <span class="badge purpose-badge">{{ flight.purpose }}</span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn btn-sm btn-outline-primary me-1" title="View Details">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-secondary" title="Download">
                        <i class="fas fa-download"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import dronelogbookAPI from '../services/dronelogbook-api'

export default {
  name: 'AirboundDashboard',
  setup() {
    const loading = ref(false)
    const error = ref('')
    const flights = ref([])
    const selectedPeriod = ref('7')
    const dashboardStats = ref(null) // Store extracted dashboard stats
  const isLoadingStats = ref(false)
  const prevDashboardStats = ref(null)

    // Global stats - use dashboard stats if available, otherwise calculate from flights
    const stats = computed(() => {
      // If we have dashboard stats, use those (more accurate)
      if (dashboardStats.value || (isLoadingStats.value && prevDashboardStats.value)) {
        const ds = (isLoadingStats.value && prevDashboardStats.value) ? prevDashboardStats.value : dashboardStats.value
        
        // Stats cards show ALL-TIME totals (never change with period selection)
        return {
          totalFlights: ds.totalFlights || 0, // All-time total
          totalFlightTime: ds.flyingTime || calculateTotalFlightTime(flights.value), // Use extracted flyingTime from dashboard
          totalDistance: ds.totalDistance ? ds.totalDistance.replace(' km', '') : estimateDistance(flights.value), // Use extracted distance, remove ' km' suffix
          totalAircraft: ds.totalAircraft || 0,
          totalPilots: countUniquePilots(flights.value)
        }
      }
      
      // Fallback: calculate from flights
      if (!flights.value.length) {
        return {
          totalFlights: 0,
          totalFlightTime: '00:00:00',
          totalDistance: '0',
          totalAircraft: 0,
          totalPilots: 0
        }
      }

      // Calculate total flight time
      const totalFlightTime = calculateTotalFlightTime(flights.value)
      const totalDistance = estimateDistance(flights.value)

      // Count unique aircraft
      const uniqueAircraft = new Set(flights.value.map(f => f.aircraft).filter(Boolean))
      
      // Count unique pilots
      const uniquePilots = countUniquePilots(flights.value)

      return {
        totalFlights: flights.value.length,
        totalFlightTime,
        totalDistance,
        totalAircraft: uniqueAircraft.size,
        totalPilots: uniquePilots
      }
    })

    // Helper functions
    const calculateTotalFlightTime = (flightsList) => {
      let totalMinutes = 0
      flightsList.forEach(flight => {
        if (flight.duration) {
          const parts = flight.duration.split(':').map(p => parseInt(p) || 0)
          const minutes = parts.length === 3 
            ? (parts[0] * 60 + parts[1] + parts[2] / 60)
            : (parts[0] + parts[1] / 60)
          totalMinutes += minutes
        }
      })

      const hours = Math.floor(totalMinutes / 60)
      const minutes = Math.floor(totalMinutes % 60)
      const seconds = Math.floor((totalMinutes % 1) * 60)
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    const estimateDistance = (flightsList) => {
      let totalMinutes = 0
      flightsList.forEach(flight => {
        if (flight.duration) {
          const parts = flight.duration.split(':').map(p => parseInt(p) || 0)
          const minutes = parts.length === 3 
            ? (parts[0] * 60 + parts[1] + parts[2] / 60)
            : (parts[0] + parts[1] / 60)
          totalMinutes += minutes
        }
      })
      return (totalMinutes * 1).toFixed(2)
    }

    const countUniquePilots = (flightsList) => {
      const uniquePilots = new Set(flightsList.map(f => f.pilot).filter(Boolean))
      return uniquePilots.size
    }

    // Recent stats for circular charts - use dashboard stats breakdown if available
    const recentStats = computed(() => {
      if (dashboardStats.value || (isLoadingStats.value && prevDashboardStats.value)) {
        const ds = (isLoadingStats.value && prevDashboardStats.value) ? prevDashboardStats.value : dashboardStats.value
        
        // Circular charts show PERIOD-FILTERED counts (change with period selection)
        let periodFlights = 0
        if (selectedPeriod.value === '7' && ds.flightsLast7Days !== undefined) {
          periodFlights = ds.flightsLast7Days
        } else if (selectedPeriod.value === '30' && ds.flightsLast30Days !== undefined) {
          periodFlights = ds.flightsLast30Days
        } else if (selectedPeriod.value === '90' && ds.flightsLast90Days !== undefined) {
          periodFlights = ds.flightsLast90Days
        } else {
          periodFlights = ds.totalFlights || 0 // Fallback to all-time if period data not available
        }
        
        return {
          recentFlights: periodFlights,
          activeDrones: ds.totalAircraft || 0,
          purposeBreakdown: ds.purposeBreakdown || {},
          aircraftBreakdown: ds.aircraftBreakdown || {}
        }
      }
      
      // Fallback to filtered flights
      const uniqueAircraft = new Set(filteredFlights.value.map(f => f.aircraft))
      return {
        recentFlights: filteredFlights.value.length,
        activeDrones: uniqueAircraft.size || 0,
        purposeBreakdown: {},
        aircraftBreakdown: {}
      }
    })

    // Purpose breakdown pie chart segments
    const purposeSegments = computed(() => {
      const breakdown = recentStats.value.purposeBreakdown
      console.log('🥧 purposeBreakdown data:', breakdown)
      if (!breakdown || Object.keys(breakdown).length === 0) {
        console.log('⚠️ No purpose breakdown data available')
        return []
      }

      // Color palette for segments
      const colors = [
        '#FF6B6B', // Red
        '#4ECDC4', // Teal
        '#45B7D1', // Blue
        '#FFA07A', // Light Salmon
        '#98D8C8', // Mint
        '#F7DC6F', // Yellow
        '#BB8FCE', // Purple
        '#85C1E2', // Sky Blue
      ]

      const entries = Object.entries(breakdown)
      const total = entries.reduce((sum, [, count]) => sum + count, 0)
      
      let currentAngle = -90 // Start at top (12 o'clock)
      
      return entries.map(([purpose, count], index) => {
        const percentage = ((count / total) * 100).toFixed(1)
        const angle = (count / total) * 360
        
        // Calculate SVG path for pie segment
        const startAngle = currentAngle
        const endAngle = currentAngle + angle
        
        const startRad = (startAngle * Math.PI) / 180
        const endRad = (endAngle * Math.PI) / 180
        
        const radius = 90
        const x1 = Math.cos(startRad) * radius
        const y1 = Math.sin(startRad) * radius
        const x2 = Math.cos(endRad) * radius
        const y2 = Math.sin(endRad) * radius
        
        const largeArc = angle > 180 ? 1 : 0
        
        const path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
        
        currentAngle = endAngle
        
        return {
          purpose,
          count,
          percentage,
          path,
          color: colors[index % colors.length]
        }
      })
    })

    // Aircraft breakdown pie chart segments
    const aircraftSegments = computed(() => {
      const breakdown = recentStats.value.aircraftBreakdown
      console.log('✈️ aircraftBreakdown data:', breakdown)
      if (!breakdown || Object.keys(breakdown).length === 0) {
        console.log('⚠️ No aircraft breakdown data available')
        return []
      }

      // Different color palette for aircraft (blues/cyans theme)
      const colors = [
        '#2196F3', // Blue
        '#FF9800', // Orange
        '#4CAF50', // Green
        '#9C27B0', // Purple
        '#00BCD4', // Cyan
        '#FF5722', // Deep Orange
        '#795548', // Brown
        '#607D8B', // Blue Grey
      ]

      const entries = Object.entries(breakdown)
      const total = entries.reduce((sum, [, count]) => sum + count, 0)
      
      let currentAngle = -90 // Start at top (12 o'clock)
      
      return entries.map(([aircraft, count], index) => {
        const percentage = ((count / total) * 100).toFixed(1)
        const angle = (count / total) * 360
        
        // Calculate SVG path for pie segment
        const startAngle = currentAngle
        const endAngle = currentAngle + angle
        
        const startRad = (startAngle * Math.PI) / 180
        const endRad = (endAngle * Math.PI) / 180
        
        const radius = 90
        const x1 = Math.cos(startRad) * radius
        const y1 = Math.sin(startRad) * radius
        const x2 = Math.cos(endRad) * radius
        const y2 = Math.sin(endRad) * radius
        
        const largeArc = angle > 180 ? 1 : 0
        
        const path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
        
        currentAngle = endAngle
        
        return {
          aircraft,
          count,
          percentage,
          path,
          color: colors[index % colors.length]
        }
      })
    })

    // Time period options
    const timePeriods = ref([
      { label: 'Last 7 days', value: '7' },
      { label: 'Last 30 days', value: '30' },
      { label: 'Last 90 days', value: '90' }
    ])

    // Filter flights by selected time period
    const filteredFlights = computed(() => {
      if (!flights.value.length) return []
      
      const now = new Date()
      const daysAgo = parseInt(selectedPeriod.value)
      const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo))
      
      return flights.value.filter(flight => {
        const flightDate = new Date(flight.date)
        return flightDate >= cutoffDate
      })
    })

    // Calculate chart data from filtered flights
    const chartData = computed(() => {
      // PRIORITY: Use monthly chart data from dashboard stats if available (from dashboard.php)
      if (dashboardStats.value?.chartData?.flyingTime && dashboardStats.value?.chartData?.flightCounts) {
        const flyingTimeData = dashboardStats.value.chartData.flyingTime
        const flightCountData = dashboardStats.value.chartData.flightCounts
        
        console.log('📊 Using dashboard chart data:', {
          flyingTimePoints: flyingTimeData.length,
          flightCountPoints: flightCountData.length,
          sampleFlyingTime: flyingTimeData.slice(0, 3),
          sampleFlightCount: flightCountData.slice(0, 3),
          allFlyingTimeLabels: flyingTimeData.map(d => d.label),
          allFlightCountLabels: flightCountData.map(d => d.label)
        })
        
        // Find max values for height calculation (only from non-zero values)
        const nonZeroFlights = flightCountData.filter(d => d.value > 0).map(d => d.value)
        const nonZeroTime = flyingTimeData.filter(d => d.value > 0).map(d => d.value)
        
        const maxFlights = nonZeroFlights.length > 0 ? Math.max(...nonZeroFlights) : 1
        const maxTime = nonZeroTime.length > 0 ? Math.max(...nonZeroTime) : 1
        
        console.log('📊 Max values for scaling:', { maxFlights, maxTime })
        console.log('📊 All flight count data:', flightCountData.map(d => ({ label: d.label, value: d.value })))
        
        // The issue: flying time has 17 points but flight counts has 13 points
        // They may not align by index. Let's match by label instead
        const flightCountMap = {}
        flightCountData.forEach(countData => {
          flightCountMap[countData.label] = countData.value
        })
        
        console.log('📊 Flight count map:', flightCountMap)
        
        // Convert max time from hours to minutes for proper scaling
        const maxTimeMinutes = maxTime * 60
        
        // Generate last 12 months
        const last12Months = []
        const currentDate = new Date()
        for (let i = 11; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
          const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          last12Months.push(label)
        }
        
        // Create a map of flying time data for quick lookup
        const flyingTimeMap = {}
        flyingTimeData.forEach(data => {
          flyingTimeMap[data.label] = data
        })
        
        // Combine the data for last 12 months
        const combinedData = last12Months.map((label) => {
          const timeData = flyingTimeMap[label]
          const flightCount = flightCountMap[label] || 0
          
          // Convert flying time from hours to minutes (if data exists)
          const flyingTimeMinutes = timeData ? timeData.value * 60 : 0
          
          // Calculate heights as percentage of max
          const flyingTimeHeight = flyingTimeMinutes > 0 ? (flyingTimeMinutes / maxTimeMinutes) * 100 : 0
          
          // For flight count: we want the axis to show maxFlights at 50% of the chart height
          // So if actual maxFlights is 557, we pretend the max is 557*2 = 1114 for height calculation
          // This makes 557 appear at 50% height
          const flightCountHeight = flightCount > 0 ? (flightCount / (maxFlights * 2)) * 100 : 0
          
          return {
            label: label,
            flyingTime: Math.round(flyingTimeMinutes), // Flying time in minutes
            flightCount: flightCount,
            flyingTimeHeight: flyingTimeHeight,
            flightCountHeight: flightCountHeight,
            tooltip: timeData ? timeData.tooltip : '00:00:00', // HH:MM:SS format
            hasData: flyingTimeMinutes > 0 || flightCount > 0
          }
        })
        
        console.log('📊 Chart data (last 12 months):', combinedData.map(d => ({
          month: d.label,
          flights: d.flightCount,
          minutes: d.flyingTime,
          tooltip: d.tooltip,
          timeHeight: d.flyingTimeHeight.toFixed(2) + '%',
          countHeight: d.flightCountHeight.toFixed(2) + '%'
        })))
        
        console.log('📊 Detailed values:', {
          maxTimeMinutes: maxTimeMinutes.toFixed(2),
          maxFlights: maxFlights,
          monthsShown: combinedData.length,
          sample: combinedData.slice(0, 2).map(d => ({
            label: d.label,
            flyingMinutes: d.flyingTime,
            heightCalc: `${d.flyingTime} / ${maxTimeMinutes.toFixed(2)} * 100 = ${d.flyingTimeHeight.toFixed(2)}%`,
            flights: d.flightCount,
            flightHeightCalc: `${d.flightCount} / ${maxFlights} * 100 = ${d.flightCountHeight.toFixed(2)}%`
          }))
        })
        
        return combinedData
      }
      
      // Fallback: calculate from flights if no dashboard data
      console.log('📊 No dashboard chart data, calculating from flights')
      
      if (!filteredFlights.value.length) {
        return []
      }

      // Group flights by month
      const monthlyData = {}
      filteredFlights.value.forEach(flight => {
        const date = new Date(flight.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            flightCount: 0,
            totalMinutes: 0
          }
        }
        
        monthlyData[monthKey].flightCount++
        
        // Parse duration (format: HH:MM:SS or MM:SS)
        if (flight.duration) {
          const parts = flight.duration.split(':').map(p => parseInt(p) || 0)
          const minutes = parts.length === 3 
            ? (parts[0] * 60 + parts[1] + parts[2] / 60)
            : (parts[0] + parts[1] / 60)
          monthlyData[monthKey].totalMinutes += minutes
        }
      })

      // Convert to chart format
      const months = Object.keys(monthlyData).sort()
      const maxFlights = Math.max(...Object.values(monthlyData).map(d => d.flightCount), 1)
      const maxMinutes = Math.max(...Object.values(monthlyData).map(d => d.totalMinutes), 1)

      return months.map(month => {
        const data = monthlyData[month]
        return {
          label: month,
          flyingTime: Math.round(data.totalMinutes),
          flightCount: data.flightCount,
          flyingTimeHeight: (data.totalMinutes / maxMinutes) * 100,
          flightCountHeight: (data.flightCount / maxFlights) * 100,
          tooltip: `${Math.floor(data.totalMinutes / 60)}h ${Math.round(data.totalMinutes % 60)}m`,
          hasData: true
        }
      })
    })

    // Max values for Y-axis labels
    const maxFlyingTime = computed(() => {
      if (!chartData.value.length) return 40
      const maxMinutes = Math.max(...chartData.value.map(d => d.flyingTime), 1)
      return Math.ceil(maxMinutes / 10) * 10 // Round up to nearest 10
    })

    const maxFlightCount = computed(() => {
      // Make the right axis always show 50% of left axis value
      // This means if left shows 2400 minutes, right shows 1200 as max label
      return Math.ceil(maxFlyingTime.value / 2)
    })

    const formatDate = (dateString) => {
      if (!dateString) return 'Unknown'
      
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }) + ' ' + date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        })
      } catch (err) {
        return 'Invalid date'
      }
    }

    const fetchFlights = async () => {
      // Preserve previous stats while new data is loading to avoid flicker
      try {
        console.log('📊 Fetching flights from API...')
        const periodDays = parseInt(selectedPeriod.value) || 7

        // Snapshot current dashboard stats so UI can keep showing them while loading
        prevDashboardStats.value = dashboardStats.value ? JSON.parse(JSON.stringify(dashboardStats.value)) : null
        isLoadingStats.value = true

        // Fetch flights (now returns first page only with embedded stats)
        const response = await dronelogbookAPI.getFlights({ periodDays })
        flights.value = response.flights || response.data || response || []
        console.log(`✅ Flights loaded: ${flights.value.length} flights displayed`)

        // Store dashboard statistics for use in computed properties
        if (response.stats) {
          dashboardStats.value = response.stats
          console.log('📊 Dashboard stats updated for period:', selectedPeriod.value, 'days')
          console.log('📊 Using dashboard statistics:', response.stats)
          console.log(`   - Total Flights: ${response.stats.totalFlights || response.stats.flightsLast7Days}`)
          console.log(`   - Total Drones: ${response.stats.totalAircraft}`)
          console.log(`   - Flying Time: ${response.stats.flyingTime}`)
          console.log(`   - Total Distance: ${response.stats.totalDistance}`)
          console.log(`   - Purpose Breakdown:`, response.stats.purposeBreakdown)
          console.log(`   - Projects: ${response.stats.totalProjects}`)
          console.log(`   - Chart Data Points: Flying Time=${response.stats.chartData?.flyingTime?.length}, Flight Counts=${response.stats.chartData?.flightCounts?.length}`)
        } else {
          dashboardStats.value = null
          console.log('⚠️ No dashboard stats found, will calculate from flights')
        }

        if (response.warning) {
          console.warn(`⚠️ ${response.warning}`)
        }
      } catch (err) {
        console.error('❌ Failed to fetch flights:', err)
        error.value = 'Failed to load flights: ' + err.message
      } finally {
        // Done loading stats
        isLoadingStats.value = false
        // Clear prev snapshot after a short delay to avoid jitter (optional)
        setTimeout(() => { prevDashboardStats.value = null }, 50)
      }
    }

    // When user switches the selected period, refresh flights to let proxy aggregate appropriately
    watch(selectedPeriod, (newVal, oldVal) => {
      console.log('⏱ Time period changed from', oldVal, 'to', newVal, '- reloading flights')
      if (newVal !== oldVal) {
        loadData()
      }
    })

    const loadData = async () => {
      loading.value = true
      error.value = ''

      try {
        await fetchFlights()
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }

    const refreshData = () => {
      loadData()
    }

    onMounted(() => {
      console.log('✅ AirboundDashboard mounted, loading data...')
      loadData()
    })

    return {
      loading,
      error,
      flights,
      filteredFlights,
      stats,
      recentStats,
      purposeSegments,
      aircraftSegments,
      timePeriods,
      selectedPeriod,
      chartData,
      maxFlyingTime,
      maxFlightCount,
      refreshData,
      formatDate,
      dashboardStats,
      isLoadingStats,
      prevDashboardStats
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 2rem;
  background-color: #f8f9fa;
  min-height: 100vh;
}

/* Header Section */
.header-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

<style scoped>
/* Dashboard Container */
.dashboard-container {
  padding: 2rem;
  background: #FCFCFC;
  min-height: 100vh;
}

/* Header Card */
.header-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #DDDDDD;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-left {
  flex: 1;
}

.company-name {
  font-size: 2.5rem;
  font-weight: 700;
  color: #03123C;
  margin: 0 0 1rem 0;
}

.stats-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.header-stats {
  display: flex;
  gap: 2rem;
}

.stat-card {
  background: linear-gradient(135deg, #21AFFF 0%, #03123C 100%);
  padding: 1.5rem 2rem;
  border-radius: 10px;
  min-width: 160px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(33, 175, 255, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(33, 175, 255, 0.4);
}

.stat-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  color: white;
  font-size: 1.75rem;
  font-weight: 700;
}

/* Navigation Card */
.nav-card {
  background: white;
  border-radius: 12px;
  padding: 1rem 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #DDDDDD;
}

.nav-tabs-custom {
  display: flex;
  gap: 2rem;
  border-bottom: none;
}

.nav-item {
  padding: 0.75rem 0;
  cursor: pointer;
  color: #585858;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  display: flex;
  align-items: center;
}

.nav-item:hover {
  color: #21AFFF;
}

.nav-item.active {
  color: #21AFFF;
  border-bottom-color: #21AFFF;
}

.nav-item .badge {
  margin-right: 0.5rem;
}

/* Content Wrapper */
.content-wrapper {
  max-width: 100%;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: #03123C;
  margin-bottom: 1.5rem;
}

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: 1.2fr 250px 1.5fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  align-items: stretch;
}

/* Card Styles */
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #DDDDDD;
  overflow: hidden;
  transition: box-shadow 0.3s, transform 0.3s;
  display: flex;
  flex-direction: column;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(33, 175, 255, 0.15);
  transform: translateY(-2px);
}

.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid #DDDDDD;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #03123C;
  margin: 0;
}

.card-body {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Pie Charts Card */
.pie-charts-card {
  grid-column: 1;
}

.pie-charts-card .card-body {
  justify-content: center;
}

.charts-horizontal {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  align-items: flex-start;
  justify-content: space-around;
  height: 100%;
}

.chart-item {
  flex: 1;
  min-width: 0; /* Allow items to shrink */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.chart-subtitle {
  font-size: 1rem;
  font-weight: 600;
  color: #03123C;
  margin-bottom: 1rem;
  text-align: center;
}

.purpose-pie-chart {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pie-svg {
  width: 100%;
  height: auto;
  max-width: 200px;
  margin: 0 auto 1rem;
  display: block;
}

.pie-segment {
  cursor: pointer;
  transition: opacity 0.2s;
}

.pie-segment:hover {
  opacity: 0.8;
}

.pie-center-number {
  font-size: 28px;
  font-weight: 700;
  fill: #03123C;
}

.pie-center-label {
  font-size: 12px;
  fill: #585858;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0;
  width: 100%;
  max-width: 250px;
}

.legend-item-pie {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  padding: 0.25rem 0;
}

.legend-color-box {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.legend-text {
  color: #555;
  line-height: 1.4;
  font-weight: 500;
  flex: 1;
}

/* Period Card */
.period-card {
  grid-column: 2;
}

.period-card .card-body {
  justify-content: center;
}

.period-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.period-btn {
  width: 100%;
  padding: 1rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  border: 2px solid #DDDDDD;
  background: white;
  color: #585858;
  border-radius: 8px;
  transition: all 0.3s;
  text-align: center;
}

.period-btn:hover {
  border-color: #21AFFF;
  background: #FFFFFF;
  color: #21AFFF;
}

.period-btn.active {
  background: linear-gradient(135deg, #21AFFF 0%, #03123C 100%);
  border-color: #21AFFF;
  color: white;
  box-shadow: 0 4px 12px rgba(33, 175, 255, 0.3);
}

/* Chart Card */
.chart-card {
  grid-column: 3;
}

.chart-card .card-body {
  display: flex;
  flex-direction: column;
  padding-bottom: 0.5rem;
}

.chart-legend {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.legend-color {
  width: 20px;
  height: 12px;
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.legend-color.flying-time {
  background: linear-gradient(to right, #4CAF50, #66BB6A);
}

.legend-color.flight-count {
  background: linear-gradient(to right, #2196F3, #42A5F5);
}

/* Bar Chart */
.bar-chart {
  position: relative;
  height: 100%;
  min-height: 300px;
  flex: 1;
  margin-top: 1rem;
}

.chart-grid {
  position: absolute;
  top: 1rem;
  left: 2.5rem;
  right: 2.5rem;
  bottom: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.grid-line {
  width: 100%;
  height: 1px;
  background: #f0f0f0;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-evenly;
  height: 100%;
  gap: 0.5rem;
  padding: 0 2.5rem 4rem;
  position: relative;
}

.bar-group {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  position: relative;
  max-width: 50px;
  height: 100%;
  cursor: pointer;
}

.bar-group:hover .bar {
  opacity: 0.85;
  transform: scaleY(1.02);
}

.bar {
  width: 14px;
  min-height: 3px;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.bar[data-value="0"] {
  min-height: 0;
  opacity: 0.1;
}

.flying-time-bar {
  background: linear-gradient(to top, #4CAF50, #66BB6A);
}

.flying-time-bar[data-value]:not([data-value="0"]) {
  min-height: 10px;
}

.flight-count-bar {
  background: linear-gradient(to top, #2196F3, #42A5F5);
}

.flight-count-bar[data-value]:not([data-value="0"]) {
  min-height: 10px;
}

.chart-x-labels {
  position: absolute;
  left: 2.5rem;
  right: 2.5rem;
  bottom: 0;
  height: 4rem;
  display: flex;
  justify-content: space-evenly;
  align-items: flex-start;
  padding-top: 35px;
}

.x-label {
  flex: 1;
  max-width: 50px;
  font-size: 0.7rem;
  color: #666;
  white-space: nowrap;
  font-weight: 600;
  transform: rotate(-45deg);
  transform-origin: top left;
}

.chart-y-axis {
  position: absolute;
  top: 1rem;
  left: 0;
  right: 0;
  bottom: 4rem;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
  padding: 0 0.5rem;
}

.y-axis-left, .y-axis-right {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #999;
  font-weight: 600;
}

.y-axis-right {
  text-align: right;
}

/* Flights Card */
.flights-card {
  grid-column: 1 / -1;
}

.flights-table {
  margin: 0;
  width: 100%;
}

.flights-table thead th {
  border-top: none;
  border-bottom: 2px solid #f0f0f0;
  font-weight: 600;
  color: #666;
  font-size: 0.875rem;
  padding: 1rem 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.flights-table tbody td {
  padding: 1.25rem 0.75rem;
  border-top: 1px solid #f5f5f5;
  vertical-align: middle;
  font-size: 0.9rem;
}

.flight-row {
  transition: background-color 0.2s;
}

.flight-row:hover {
  background-color: #f8f9ff;
}

.aircraft-info {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.purpose-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 0.8rem;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-dark {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
  padding: 0.625rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  transition: all 0.3s;
}

.btn-dark:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .pie-charts-card,
  .period-card,
  .chart-card {
    grid-column: 1;
  }
  
  .period-buttons {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .period-btn {
    flex: 1;
    min-width: 120px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-stats {
    width: 100%;
    flex-direction: column;
    gap: 1rem;
  }
  
  .stat-card {
    width: 100%;
  }
  
  .company-name {
    font-size: 2rem;
  }
  
  .nav-tabs-custom {
    overflow-x: auto;
    gap: 1rem;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .charts-horizontal {
    flex-direction: column;
    gap: 2rem;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .chart-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .bar-chart {
    height: 250px;
  }
  
  .flights-table {
    font-size: 0.85rem;
  }
  
  .flights-table thead th,
  .flights-table tbody td {
    padding: 0.75rem 0.5rem;
  }
}

@media (max-width: 576px) {
  .header-card,
  .nav-card,
  .card {
    border-radius: 8px;
    padding: 1rem;
  }
  
  .card-body {
    padding: 1rem;
  }
  
  .period-buttons {
    flex-direction: column;
  }
  
  .period-btn {
    width: 100%;
  }
}
</style>
