<template>
  <div class="container-fluid p-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="mb-0">🚁 Simple Flight Dashboard</h1>
      <button class="btn btn-outline-primary" @click="refreshData" :disabled="loading">
        <i class="fas fa-sync-alt me-2" :class="{ 'fa-spin': loading }"></i>
        Refresh
      </button>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading && !flights.length" class="text-center py-5">
      <i class="fas fa-spinner fa-spin fa-3x text-primary mb-3"></i>
      <h4>Loading Flight Data...</h4>
      <p class="text-muted">Fetching your flights from Dronelogbook API</p>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger">
      <i class="fas fa-exclamation-triangle me-2"></i>
      <strong>Error:</strong> {{ error }}
      <button class="btn btn-sm btn-outline-danger ms-2" @click="refreshData">
        Try Again
      </button>
    </div>
    
    <!-- Dashboard Content -->
    <div v-else>
      <!-- Stats Cards -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card text-center h-100">
            <div class="card-body">
              <i class="fas fa-plane fa-3x text-primary mb-3"></i>
              <h3>{{ stats.totalFlights }}</h3>
              <p class="text-muted mb-0">Total Flights</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center h-100">
            <div class="card-body">
              <i class="fas fa-clock fa-3x text-success mb-3"></i>
              <h3>{{ stats.totalFlightTime }}</h3>
              <p class="text-muted mb-0">Flight Time</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center h-100">
            <div class="card-body">
              <i class="fas fa-helicopter fa-3x text-warning mb-3"></i>
              <h3>{{ stats.totalAircraft }}</h3>
              <p class="text-muted mb-0">Aircraft</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center h-100">
            <div class="card-body">
              <i class="fas fa-users fa-3x text-info mb-3"></i>
              <h3>{{ stats.totalPilots }}</h3>
              <p class="text-muted mb-0">Pilots</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Flights -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="fas fa-list me-2"></i>
            Recent Flights
          </h5>
          <span class="badge bg-primary">{{ flights.length }} flights</span>
        </div>
        <div class="card-body">
          <div v-if="flights.length === 0" class="text-center py-4">
            <i class="fas fa-plane-slash fa-3x text-muted mb-3"></i>
            <h5>No flights found</h5>
            <p class="text-muted">Upload your first flight log to get started!</p>
          </div>
          
          <div v-else class="table-responsive">
            <table class="table table-hover">
              <thead class="table-light">
                <tr>
                  <th>Flight ID</th>
                  <th>Aircraft</th>
                  <th>Duration</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="flight in flights.slice(0, 10)" :key="flight.id">
                  <td>
                    <strong>{{ flight.id || 'Unknown' }}</strong>
                    <br>
                    <small class="text-muted">{{ flight.notes || 'No notes' }}</small>
                  </td>
                  <td>
                    <i class="fas fa-helicopter me-2 text-primary"></i>
                    {{ flight.aircraft || 'Unknown Aircraft' }}
                  </td>
                  <td>{{ flight.duration || 'Unknown' }}</td>
                  <td>{{ formatDate(flight.date) }}</td>
                  <td>
                    <span class="badge" :class="getStatusBadgeClass(flight.status)">
                      {{ flight.status || 'Unknown' }}
                    </span>
                  </td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button 
                        class="btn btn-outline-primary" 
                        @click="viewFlight(flight)"
                        title="View Details"
                      >
                        <i class="fas fa-eye"></i>
                      </button>
                      <button 
                        class="btn btn-outline-success" 
                        @click="plotFlight(flight)"
                        title="Plot Flight"
                      >
                        <i class="fas fa-route"></i>
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
import { ref, onMounted, computed } from 'vue'
import dronelogbookAPI from '../services/dronelogbook-api'

export default {
  name: 'SimpleDashboard',
  setup() {
    const loading = ref(false)
    const error = ref('')
    const flights = ref([])
    const aircraft = ref([])
    const pilots = ref([])

    const stats = computed(() => ({
      totalFlights: flights.value.length,
      totalFlightTime: calculateTotalFlightTime(),
      totalAircraft: aircraft.value.length || 5,
      totalPilots: pilots.value.length || 3
    }))

    const calculateTotalFlightTime = () => {
      const totalSeconds = flights.value.reduce((total, flight) => {
        return total + (flight.duration || 0)
      }, 0)
      
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`
      }
      return `${minutes}m`
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'Unknown'
      
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      } catch (err) {
        return 'Invalid date'
      }
    }

    const getStatusBadgeClass = (status) => {
      switch (status?.toLowerCase()) {
        case 'completed':
        case 'success':
          return 'bg-success'
        case 'processing':
        case 'analyzing':
          return 'bg-warning'
        case 'failed':
        case 'error':
          return 'bg-danger'
        default:
          return 'bg-secondary'
      }
    }

    const fetchFlights = async () => {
      try {
        console.log('📊 Fetching flights from API...')
        const response = await dronelogbookAPI.getFlights({ limit: 50 })
        flights.value = response.flights || response.data || response || []
        console.log('✅ Flights loaded:', flights.value.length)
      } catch (err) {
        console.error('❌ Failed to fetch flights:', err)
        throw new Error('Failed to load flights: ' + err.message)
      }
    }

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

    const viewFlight = (flight) => {
      console.log('👁️ View flight:', flight)
      alert(`Viewing flight: ${flight.name || flight.id}`)
    }

    const plotFlight = (flight) => {
      console.log('📈 Plot flight:', flight)
      alert(`Plotting flight: ${flight.name || flight.id}`)
    }

    onMounted(() => {
      console.log('✅ SimpleDashboard mounted, loading data...')
      loadData()
    })

    return {
      loading,
      error,
      flights,
      stats,
      refreshData,
      viewFlight,
      plotFlight,
      formatDate,
      getStatusBadgeClass
    }
  }
}
</script>

<style scoped>
.card {
  border: none;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  transition: box-shadow 0.15s ease-in-out;
}

.card:hover {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.table th {
  border-top: none;
  font-weight: 600;
}

.badge {
  font-size: 0.75em;
}
</style>