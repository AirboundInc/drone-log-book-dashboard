<template>
  <DashboardLayout>
    <!-- Recent Flights Widget -->
    <div class="row">
      <div class="col-lg-8">
        <div class="widget">
          <div class="widget-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Recent Flights</h5>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary" @click="refreshFlights">
                <i class="fas fa-sync-alt me-1"></i>
                Refresh
              </button>
              <button class="btn btn-sm btn-primary" @click="showFilters = !showFilters">
                <i class="fas fa-filter me-1"></i>
                Filters
              </button>
            </div>
          </div>
          
          <!-- Filters -->
          <div v-show="showFilters" class="p-3 border-bottom bg-light">
            <div class="row g-3">
              <div class="col-md-3">
                <label class="form-label">Date Range</label>
                <select class="form-select form-select-sm" v-model="dateFilter">
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label">Aircraft</label>
                <select class="form-select form-select-sm" v-model="aircraftFilter">
                  <option value="">All Aircraft</option>
                  <option value="mavic">DJI Mavic Pro</option>
                  <option value="phantom">DJI Phantom 4</option>
                  <option value="custom">Custom Quadcopter</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label">Status</label>
                <select class="form-select form-select-sm" v-model="statusFilter">
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="error">Error</option>
                  <option value="analyzing">Analyzing</option>
                </select>
              </div>
              <div class="col-md-3 d-flex align-items-end">
                <button class="btn btn-sm btn-outline-secondary" @click="clearFilters">
                  <i class="fas fa-times me-1"></i>
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div class="widget-content">
            <FlightList 
              :flights="filteredFlights" 
              :loading="loading"
              @flight-selected="handleFlightSelected"
              @add-to-comparison="handleAddToComparison"
            />
          </div>
        </div>
      </div>

      <!-- Quick Actions & Summary -->
      <div class="col-lg-4">
        <!-- Quick Actions -->
        <div class="widget mb-3">
          <div class="widget-header">
            <h5 class="mb-0">Quick Actions</h5>
          </div>
          <div class="widget-content">
            <div class="d-grid gap-2">
              <button class="btn btn-primary">
                <i class="fas fa-upload me-2"></i>
                Upload Flight Log
              </button>
              <button class="btn btn-outline-primary">
                <i class="fas fa-plane me-2"></i>
                Plan New Flight
              </button>
              <button class="btn btn-outline-secondary">
                <i class="fas fa-download me-2"></i>
                Export Data
              </button>
            </div>
          </div>
        </div>

        <!-- Flight Activity Chart -->
        <div class="widget mb-3">
          <div class="widget-header">
            <h5 class="mb-0">Flight Activity (Last 30 Days)</h5>
          </div>
          <div class="widget-content">
            <ActivityChart :data="activityData" />
          </div>
        </div>

        <!-- Aircraft Status -->
        <div class="widget">
          <div class="widget-header">
            <h5 class="mb-0">Aircraft Status</h5>
          </div>
          <div class="widget-content">
            <div class="list-group list-group-flush">
              <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                <div>
                  <strong>DJI Mavic Pro</strong>
                  <small class="d-block text-muted">Last flight: 2 hours ago</small>
                </div>
                <span class="badge bg-success">Active</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                <div>
                  <strong>DJI Phantom 4</strong>
                  <small class="d-block text-muted">Last flight: 1 day ago</small>
                </div>
                <span class="badge bg-warning">Maintenance</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                <div>
                  <strong>Custom Quadcopter</strong>
                  <small class="d-block text-muted">Last flight: 3 days ago</small>
                </div>
                <span class="badge bg-success">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Flight Comparison Selection -->
    <div v-if="selectedFlights.length > 0" class="row mt-4">
      <div class="col-12">
        <div class="widget">
          <div class="widget-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Selected for Comparison ({{ selectedFlights.length }}/4)</h5>
            <div class="d-flex gap-2">
              <button 
                class="btn btn-sm btn-primary" 
                :disabled="selectedFlights.length < 2"
                @click="compareFlights"
              >
                <i class="fas fa-balance-scale me-1"></i>
                Compare Selected
              </button>
              <button class="btn btn-sm btn-outline-secondary" @click="clearComparison">
                <i class="fas fa-times me-1"></i>
                Clear Selection
              </button>
            </div>
          </div>
          <div class="widget-content">
            <div class="row">
              <div 
                v-for="flight in selectedFlights" 
                :key="flight.id" 
                class="col-md-3 mb-2"
              >
                <div class="card card-sm">
                  <div class="card-body p-2">
                    <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <small class="text-muted">{{ formatDate(flight.date) }}</small>
                        <div class="fw-bold">{{ flight.aircraft_name }}</div>
                        <small>{{ formatDuration(flight.duration) }}</small>
                      </div>
                      <button 
                        class="btn btn-sm btn-outline-danger" 
                        @click="removeFromComparison(flight.id)"
                      >
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  </div>
  </DashboardLayout>
</template><script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFlightStore } from '@/stores/flight'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import FlightList from '@/components/FlightList.vue'
import ActivityChart from '@/components/ActivityChart.vue'
import dronelogbookAPI from '@/services/dronelogbook-api'

export default {
  name: 'Dashboard',
  components: {
    DashboardLayout,
    FlightList,
    ActivityChart
  },
  setup() {
    const router = useRouter()
    const flightStore = useFlightStore()

    // Local state
    const showFilters = ref(false)
    const dateFilter = ref('')
    const aircraftFilter = ref('')
    const statusFilter = ref('')
    const activityData = ref([])

    // Computed properties
    const loading = computed(() => flightStore.loading)
    const selectedFlights = computed(() => flightStore.selectedFlights)
    const filteredFlights = computed(() => {
      let flights = flightStore.filteredFlights
      
      // Apply additional filters
      if (dateFilter.value) {
        const now = new Date()
        let startDate
        
        switch (dateFilter.value) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
        }
        
        if (startDate) {
          flights = flights.filter(flight => new Date(flight.date) >= startDate)
        }
      }
      
      if (aircraftFilter.value) {
        flights = flights.filter(flight => 
          flight.aircraft_name?.toLowerCase().includes(aircraftFilter.value.toLowerCase())
        )
      }
      
      if (statusFilter.value) {
        flights = flights.filter(flight => flight.status === statusFilter.value)
      }
      
      return flights.slice(0, 20) // Limit to recent 20 flights
    })

    // Methods
    const refreshFlights = async () => {
      try {
        flightStore.setLoading(true)
        const flights = await dronelogbookAPI.getFlights({ limit: 100 })
        flightStore.setFlights(flights.data || [])
      } catch (error) {
        flightStore.setError(error.message)
      } finally {
        flightStore.setLoading(false)
      }
    }

    const clearFilters = () => {
      dateFilter.value = ''
      aircraftFilter.value = ''
      statusFilter.value = ''
      flightStore.clearFilters()
    }

    const handleFlightSelected = (flight) => {
      router.push(`/flight/${flight.id}`)
    }

    const handleAddToComparison = (flight) => {
      flightStore.addToComparison(flight)
    }

    const removeFromComparison = (flightId) => {
      flightStore.removeFromComparison(flightId)
    }

    const clearComparison = () => {
      flightStore.clearComparison()
    }

    const compareFlights = () => {
      router.push('/compare')
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

    // Load activity data
    const loadActivityData = async () => {
      try {
        const stats = await dronelogbookAPI.getFlightStatistics({ 
          time_range: '30d',
          group_by: 'day'
        })
        activityData.value = stats.data || []
      } catch (error) {
        console.error('Failed to load activity data:', error)
        // Generate mock data for demo
        activityData.value = generateMockActivityData()
      }
    }

    const generateMockActivityData = () => {
      const data = []
      const now = new Date()
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        data.push({
          date: date.toISOString().split('T')[0],
          flights: Math.floor(Math.random() * 5),
          duration: Math.floor(Math.random() * 3600) // seconds
        })
      }
      
      return data
    }

    // Lifecycle
    onMounted(() => {
      loadActivityData()
    })

    return {
      // Local state
      showFilters,
      dateFilter,
      aircraftFilter,
      statusFilter,
      activityData,
      
      // Computed
      loading,
      selectedFlights,
      filteredFlights,
      
      // Methods
      refreshFlights,
      clearFilters,
      handleFlightSelected,
      handleAddToComparison,
      removeFromComparison,
      clearComparison,
      compareFlights,
      formatDate,
      formatDuration
    }
  }
}
</script>

<style scoped>
.card-sm .card-body {
  font-size: 0.875rem;
}

.list-group-item {
  border-left: none;
  border-right: none;
}

.list-group-item:first-child {
  border-top: none;
}

.list-group-item:last-child {
  border-bottom: none;
}
</style>