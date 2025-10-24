<template>
  <DashboardLayout>
    <div v-if="loading" class="loading-spinner">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading flight data...</span>
      </div>
    </div>

    <div v-else-if="flight" class="flight-analysis">
      <!-- Flight Header -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="widget">
            <div class="widget-content">
              <div class="row align-items-center">
                <div class="col-md-8">
                  <div class="d-flex align-items-center">
                    <div class="me-4">
                      <i class="fas fa-plane fa-3x text-primary"></i>
                    </div>
                    <div>
                      <h3 class="mb-1">{{ flight.name || `Flight ${flight.id}` }}</h3>
                      <div class="text-muted mb-2">
                        <i class="fas fa-calendar me-1"></i>
                        {{ formatDate(flight.date) }} at {{ formatTime(flight.start_time) }}
                      </div>
                      <div class="d-flex gap-3">
                        <span class="badge bg-light text-dark">
                          <i class="fas fa-helicopter me-1"></i>
                          {{ flight.aircraft_name }}
                        </span>
                        <span class="badge bg-light text-dark">
                          <i class="fas fa-user me-1"></i>
                          {{ flight.pilot_name }}
                        </span>
                        <span class="badge bg-light text-dark">
                          <i class="fas fa-clock me-1"></i>
                          {{ formatDuration(flight.duration) }}
                        </span>
                        <span class="badge bg-light text-dark">
                          <i class="fas fa-route me-1"></i>
                          {{ formatDistance(flight.distance) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4 text-md-end">
                  <div class="btn-group">
                    <button class="btn btn-outline-primary" @click="downloadLogs">
                      <i class="fas fa-download me-1"></i>
                      Download Logs
                    </button>
                    <button class="btn btn-outline-success" @click="addToComparison">
                      <i class="fas fa-balance-scale me-1"></i>
                      Add to Compare
                    </button>
                    <button class="btn btn-outline-secondary" @click="shareflight">
                      <i class="fas fa-share me-1"></i>
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="row">
        <!-- Left Column - Map and Timeline -->
        <div class="col-lg-8">
          <!-- 3D Map -->
          <div class="widget mb-4">
            <div class="widget-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Flight Path</h5>
              <div class="btn-group btn-group-sm">
                <button 
                  class="btn"
                  :class="mapMode === '3d' ? 'btn-primary' : 'btn-outline-primary'"
                  @click="mapMode = '3d'"
                >
                  3D
                </button>
                <button 
                  class="btn"
                  :class="mapMode === '2d' ? 'btn-primary' : 'btn-outline-primary'"
                  @click="mapMode = '2d'"
                >
                  2D
                </button>
              </div>
            </div>
            <div class="widget-content p-0">
              <FlightMap 
                v-if="telemetryData"
                :flight="flight"
                :telemetry="telemetryData"
                :mode="mapMode"
                :current-time="currentTime"
                @time-changed="handleTimeChanged"
              />
            </div>
          </div>

          <!-- Parameter Plots -->
          <div class="widget">
            <div class="widget-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Flight Parameters</h5>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-secondary" @click="showPlotSelector = true">
                  <i class="fas fa-plus me-1"></i>
                  Add Plot
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="resetPlots">
                  <i class="fas fa-undo me-1"></i>
                  Reset
                </button>
              </div>
            </div>
            <div class="widget-content">
              <FlightPlots 
                v-if="telemetryData"
                :telemetry="telemetryData"
                :parameters="parameters"
                :current-time="currentTime"
                :selected-plots="selectedPlots"
                @time-changed="handleTimeChanged"
                @plot-added="handlePlotAdded"
                @plot-removed="handlePlotRemoved"
              />
            </div>
          </div>
        </div>

        <!-- Right Column - Stats and Events -->
        <div class="col-lg-4">
          <!-- Flight Statistics -->
          <div class="widget mb-4">
            <div class="widget-header">
              <h5 class="mb-0">Flight Statistics</h5>
            </div>
            <div class="widget-content">
              <FlightStats :flight="flight" :telemetry="telemetryData" />
            </div>
          </div>

          <!-- Flight Events -->
          <div class="widget mb-4">
            <div class="widget-header">
              <h5 class="mb-0">Flight Events</h5>
            </div>
            <div class="widget-content">
              <FlightEvents 
                :events="events"
                :current-time="currentTime"
                @event-selected="handleEventSelected"
              />
            </div>
          </div>

          <!-- Flight Modes -->
          <div class="widget">
            <div class="widget-header">
              <h5 class="mb-0">Flight Modes</h5>
            </div>
            <div class="widget-content">
              <FlightModes 
                :modes="flightModes"
                :current-time="currentTime"
                @mode-selected="handleModeSelected"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Plot Selector Modal -->
    <PlotSelector 
      v-if="showPlotSelector"
      :available-parameters="availableParameters"
      @plot-selected="handlePlotSelected"
      @close="showPlotSelector = false"
    />
  </DashboardLayout>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useFlightStore } from '@/stores/flight'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import FlightMap from '@/components/FlightMap.vue'
import FlightPlots from '@/components/FlightPlots.vue'
import FlightStats from '@/components/FlightStats.vue'
import FlightEvents from '@/components/FlightEvents.vue'
import FlightModes from '@/components/FlightModes.vue'
import PlotSelector from '@/components/PlotSelector.vue'
import dronelogbookAPI from '@/services/dronelogbook-api'

export default {
  name: 'FlightAnalysis',
  components: {
    DashboardLayout,
    FlightMap,
    FlightPlots,
    FlightStats,
    FlightEvents,
    FlightModes,
    PlotSelector
  },
  setup() {
    const route = useRoute()
    const flightStore = useFlightStore()

    // Local state
    const loading = ref(true)
    const flight = ref(null)
    const telemetryData = ref(null)
    const parameters = ref({})
    const events = ref([])
    const flightModes = ref([])
    const currentTime = ref(0)
    const mapMode = ref('3d')
    const showPlotSelector = ref(false)
    const selectedPlots = ref([
      'altitude',
      'ground_speed',
      'battery_voltage',
      'gps_satellites'
    ])

    // Computed properties
    const availableParameters = computed(() => {
      if (!telemetryData.value) return []
      
      // Extract parameter names from telemetry data
      const paramNames = new Set()
      if (telemetryData.value.length > 0) {
        Object.keys(telemetryData.value[0]).forEach(key => {
          if (key !== 'timestamp' && typeof telemetryData.value[0][key] === 'number') {
            paramNames.add(key)
          }
        })
      }
      
      return Array.from(paramNames).sort()
    })

    // Methods
    const loadFlightData = async () => {
      try {
        loading.value = true
        const flightId = route.params.id

        // Load flight details
        const flightData = await dronelogbookAPI.getFlight(flightId)
        flight.value = flightData

        // Load telemetry data
        const telemetry = await dronelogbookAPI.getFlightTelemetry(flightId)
        telemetryData.value = telemetry.data || []

        // Load parameters
        const params = await dronelogbookAPI.getFlightParameters(flightId)
        parameters.value = params.data || {}

        // Load events
        const eventData = await dronelogbookAPI.getFlightEvents(flightId)
        events.value = eventData.data || []

        // Extract flight modes from telemetry
        extractFlightModes()

        // Set current flight in store
        flightStore.setCurrentFlight(flight.value)

      } catch (error) {
        console.error('Failed to load flight data:', error)
        // Generate mock data for demo
        loadMockData()
      } finally {
        loading.value = false
      }
    }

    const loadMockData = () => {
      flight.value = {
        id: route.params.id,
        name: `Flight ${route.params.id}`,
        date: new Date().toISOString().split('T')[0],
        start_time: new Date().toISOString(),
        duration: 1800, // 30 minutes
        distance: 5000, // 5km
        aircraft_name: 'DJI Mavic Pro',
        pilot_name: 'Demo Pilot',
        status: 'completed'
      }

      // Generate mock telemetry data
      const mockTelemetry = []
      const startTime = Date.now()
      
      for (let i = 0; i < 1800; i += 5) { // Every 5 seconds for 30 minutes
        mockTelemetry.push({
          timestamp: startTime + i * 1000,
          altitude: 50 + Math.sin(i / 100) * 20 + Math.random() * 5,
          ground_speed: 10 + Math.random() * 15,
          battery_voltage: 14.8 - (i / 1800) * 2.8 + Math.random() * 0.2,
          gps_satellites: 8 + Math.floor(Math.random() * 4),
          latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
          roll: (Math.random() - 0.5) * 30,
          pitch: (Math.random() - 0.5) * 30,
          yaw: (Math.random() - 0.5) * 180
        })
      }
      
      telemetryData.value = mockTelemetry

      // Mock events
      events.value = [
        { timestamp: startTime + 30000, type: 'takeoff', message: 'Aircraft took off' },
        { timestamp: startTime + 900000, type: 'mode_change', message: 'Mode changed to AUTO' },
        { timestamp: startTime + 1770000, type: 'landing', message: 'Aircraft landed safely' }
      ]

      // Mock flight modes
      flightModes.value = [
        { start_time: startTime, end_time: startTime + 30000, mode: 'MANUAL' },
        { start_time: startTime + 30000, end_time: startTime + 900000, mode: 'STABILIZE' },
        { start_time: startTime + 900000, end_time: startTime + 1770000, mode: 'AUTO' },
        { start_time: startTime + 1770000, end_time: startTime + 1800000, mode: 'LAND' }
      ]
    }

    const extractFlightModes = () => {
      // Extract flight modes from telemetry or events
      // This would depend on the actual data structure from Dronelogbook API
      flightModes.value = []
    }

    const handleTimeChanged = (time) => {
      currentTime.value = time
    }

    const handleEventSelected = (event) => {
      currentTime.value = event.timestamp
    }

    const handleModeSelected = (mode) => {
      currentTime.value = mode.start_time
    }

    const handlePlotSelected = (parameterName) => {
      if (!selectedPlots.value.includes(parameterName)) {
        selectedPlots.value.push(parameterName)
      }
      showPlotSelector.value = false
    }

    const handlePlotAdded = (parameterName) => {
      handlePlotSelected(parameterName)
    }

    const handlePlotRemoved = (parameterName) => {
      const index = selectedPlots.value.indexOf(parameterName)
      if (index > -1) {
        selectedPlots.value.splice(index, 1)
      }
    }

    const resetPlots = () => {
      selectedPlots.value = ['altitude', 'ground_speed', 'battery_voltage', 'gps_satellites']
    }

    const downloadLogs = async () => {
      try {
        await dronelogbookAPI.downloadFlightLog(flight.value.id, 'csv')
      } catch (error) {
        console.error('Download failed:', error)
      }
    }

    const addToComparison = () => {
      flightStore.addToComparison(flight.value)
    }

    const shareflight = () => {
      const url = window.location.href
      navigator.clipboard.writeText(url).then(() => {
        console.log('Flight URL copied to clipboard')
      })
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString()
    }

    const formatTime = (timeString) => {
      return new Date(timeString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    const formatDuration = (seconds) => {
      if (!seconds) return '0m'
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`
      }
      return `${minutes}m`
    }

    const formatDistance = (meters) => {
      if (!meters) return '0m'
      if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)}km`
      }
      return `${Math.round(meters)}m`
    }

    // Lifecycle
    onMounted(() => {
      loadFlightData()
    })

    return {
      // Local state
      loading,
      flight,
      telemetryData,
      parameters,
      events,
      flightModes,
      currentTime,
      mapMode,
      showPlotSelector,
      selectedPlots,
      
      // Computed
      availableParameters,
      
      // Methods
      handleTimeChanged,
      handleEventSelected,
      handleModeSelected,
      handlePlotSelected,
      handlePlotAdded,
      handlePlotRemoved,
      resetPlots,
      downloadLogs,
      addToComparison,
      shareFloat,
      formatDate,
      formatTime,
      formatDuration,
      formatDistance
    }
  }
}
</script>

<style scoped>
.flight-analysis {
  max-width: none;
}

.loading-spinner {
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.badge {
  font-size: 0.875rem;
}
</style>