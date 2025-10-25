<template>
  <div class="dashboard-container">
    <!-- Header Section -->
    <div class="header-section mb-4">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h1 class="company-name">Airbound</h1>
          <div class="stats-buttons mt-2">
            <button class="btn btn-outline-secondary btn-sm me-2">View Individual Stats</button>
            <button class="btn btn-outline-secondary btn-sm">View Current Year</button>
          </div>
        </div>
        <div class="top-stats d-flex">
          <div class="stat-item text-center me-5">
            <div class="stat-label">Flying Time</div>
            <div class="stat-value">{{ stats.totalFlightTime }}</div>
          </div>
          <div class="stat-item text-center me-5">
            <div class="stat-label">Flights</div>
            <div class="stat-value">{{ stats.totalFlights }}</div>
          </div>
          <div class="stat-item text-center">
            <div class="stat-label">Total Travelled Distance</div>
            <div class="stat-value">{{ stats.totalDistance }} km</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <nav class="dashboard-nav mb-4">
      <div class="nav-tabs-custom">
        <div class="nav-item active">
          <span class="badge bg-danger">2</span>
          Flights
        </div>
        <div class="nav-item">Maintenance</div>
        <div class="nav-item">Inventory</div>
        <div class="nav-item">Documents</div>
        <div class="nav-item">Incidents</div>
      </div>
    </nav>

    <!-- Main Dashboard Content -->
    <div class="row">
      <div class="col-12">
        <h2 class="section-title mb-4">Flights</h2>
      </div>
    </div>

    <!-- Charts and Stats Section -->
    <div class="row mb-5">
      <!-- Circular Charts -->
      <div class="col-md-4">
        <div class="chart-container">
          <div class="circular-chart-wrapper">
            <div class="circular-chart flights-chart">
              <div class="chart-center">
                <div class="chart-number">{{ recentStats.recentFlights }}</div>
                <div class="chart-label">FLIGHTS</div>
              </div>
            </div>
          </div>
          <div class="circular-chart-wrapper mt-4">
            <div class="circular-chart drones-chart">
              <div class="chart-center">
                <div class="chart-number">{{ recentStats.activeDrones }}</div>
                <div class="chart-label">DRONES</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Time Period Selector -->
      <div class="col-md-3">
        <div class="time-selector">
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

      <!-- Bar Chart -->
      <div class="col-md-5">
        <div class="bar-chart-container">
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-color flying-time"></span>
              Flying Time (minutes)
            </span>
            <span class="legend-item">
              <span class="legend-color flight-count"></span>
              Flight #
            </span>
            <span class="text-muted ms-3" style="font-size: 0.8rem;">
              (12 months)
            </span>
          </div>
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

    <!-- Recent Flights Section -->
    <div class="row">
      <div class="col-12">
        <div class="flights-section">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h3 class="section-title">Latest Flights ({{ filteredFlights.length }})</h3>
            <button class="btn btn-dark">View All</button>
          </div>
          
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
                  <th style="width: 15%;">Date</th>
                  <th style="width: 15%;">Aircraft</th>
                  <th style="width: 12%;">Duration</th>
                  <th style="width: 35%;">Location</th>
                  <th style="width: 15%;">Purpose</th>
                  <th style="width: 8%;">Actions</th>
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

    // Global stats - use dashboard stats if available, otherwise calculate from flights
    const stats = computed(() => {
      // If we have dashboard stats, use those (more accurate)
      if (dashboardStats.value) {
        const ds = dashboardStats.value
        
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
      if (dashboardStats.value) {
        const ds = dashboardStats.value
        
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
          purposeBreakdown: ds.purposeBreakdown || {}
        }
      }
      
      // Fallback to filtered flights
      const uniqueAircraft = new Set(filteredFlights.value.map(f => f.aircraft))
      return {
        recentFlights: filteredFlights.value.length,
        activeDrones: uniqueAircraft.size || 0,
        purposeBreakdown: {}
      }
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
      try {
        console.log('📊 Fetching flights from API...')
        
        const periodDays = parseInt(selectedPeriod.value) || 7
        
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
      timePeriods,
      selectedPeriod,
      chartData,
      maxFlyingTime,
      maxFlightCount,
      refreshData,
      formatDate,
      dashboardStats
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

.company-name {
  font-size: 2.5rem;
  font-weight: 300;
  color: #333;
  margin: 0;
}

.stats-buttons .btn {
  border-radius: 20px;
  border: 1px solid #ccc;
  color: #666;
}

.top-stats {
  align-items: flex-end;
}

.stat-item {
  min-width: 150px;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
}

/* Navigation Tabs */
.dashboard-nav {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-tabs-custom {
  display: flex;
  background: #4a4a4a;
}

.nav-item {
  padding: 1rem 2rem;
  color: #ccc;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-item.active {
  background: #333;
  color: white;
}

.nav-item .badge {
  margin-right: 0.5rem;
}

/* Section Title */
.section-title {
  font-size: 1.5rem;
  font-weight: 400;
  color: #333;
  margin: 2rem 0 1rem 0;
}

/* Charts Section */
.chart-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.circular-chart-wrapper {
  display: flex;
  justify-content: center;
}

.circular-chart {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flights-chart {
  background: conic-gradient(#4CAF50 0deg 280deg, #e0e0e0 280deg 360deg);
}

.drones-chart {
  background: conic-gradient(#2196F3 0deg 200deg, #FF9800 200deg 320deg, #e0e0e0 320deg 360deg);
}

.chart-center {
  background: white;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.chart-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.chart-label {
  font-size: 0.7rem;
  color: #666;
  font-weight: 500;
}

/* Time Selector */
.time-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}

.period-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 25px;
  padding: 0.75rem 1.5rem;
  color: #666;
  text-align: center;
}

.period-btn.active {
  background: #333;
  color: white;
  border-color: #333;
}

/* Bar Chart */
.bar-chart-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chart-legend {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.flying-time {
  background: #4CAF50;
}

.legend-color.flight-count {
  background: #2196F3;
}

.bar-chart {
  position: relative;
  height: 350px;
  padding-top: 1rem;
  padding-bottom: 4rem;
}

.chart-grid {
  position: absolute;
  top: 1rem;
  left: 2rem;
  right: 2rem;
  bottom: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.grid-line {
  width: 100%;
  height: 1px;
  background: #e0e0e0;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-evenly;
  height: 100%;
  gap: 0.25rem;
  padding: 0 2rem 0 2rem;
  position: relative;
}

.bar-group {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  position: relative;
  max-width: 50px;
  height: 100%;
  cursor: pointer;
}

.bar-group:hover .bar {
  opacity: 0.8;
}

.bar {
  width: 12px;
  min-height: 3px;
  border-radius: 3px 3px 0 0;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.bar[data-value="0"] {
  min-height: 0;
  opacity: 0.1;
}

.flying-time-bar {
  background: linear-gradient(to top, #4CAF50, #66BB6A);
}

.flying-time-bar[data-value]:not([data-value="0"]) {
  min-height: 8px;
}

.flight-count-bar {
  background: linear-gradient(to top, #2196F3, #42A5F5);
}

.flight-count-bar[data-value]:not([data-value="0"]) {
  min-height: 8px;
}

.bar-label {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 10px;
  transform: rotate(-45deg);
  transform-origin: top left;
  font-size: 0.65rem;
  color: #666;
  white-space: nowrap;
  font-weight: 500;
}

.chart-x-labels {
  position: absolute;
  left: 2rem;
  right: 2rem;
  bottom: 0;
  height: 4rem;
  display: flex;
  justify-content: space-evenly;
  align-items: flex-start;
  padding-top: 30px;
}

.x-label {
  flex: 1;
  max-width: 50px;
  font-size: 0.65rem;
  color: #666;
  white-space: nowrap;
  font-weight: 500;
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
  font-weight: 500;
}

.y-axis-right {
  text-align: right;
}

/* Flights Section */
.flights-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.flights-table {
  margin: 0;
}

.flights-table thead th {
  border-top: none;
  border-bottom: 2px solid #e9ecef;
  font-weight: 600;
  color: #666;
  font-size: 0.9rem;
  padding: 1rem 0.75rem;
}

.flights-table tbody td {
  padding: 1rem 0.75rem;
  border-top: 1px solid #f0f0f0;
  vertical-align: middle;
}

.flight-row:hover {
  background-color: #f8f9fa;
}

.aircraft-info {
  display: flex;
  align-items: center;
}

.purpose-badge {
  background: #e3f2fd;
  color: #1976d2;
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-dark {
  background: #333;
  border-color: #333;
}

.btn-dark:hover {
  background: #222;
  border-color: #222;
}

/* Responsive Design */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 1rem;
  }
  
  .header-section {
    padding: 1.5rem;
  }
  
  .top-stats {
    flex-direction: column;
    gap: 1rem;
  }
  
  .stat-item {
    min-width: auto;
  }
  
  .company-name {
    font-size: 2rem;
  }
  
  .chart-bars {
    gap: 0.5rem;
  }
}
</style>