<template>
  <div class="dashboard-container d-flex">
    <!-- Sidebar -->
    <div class="sidebar d-flex flex-column">
      <!-- Brand -->
      <div class="p-3 border-bottom">
        <h4 class="mb-0">
          <i class="fas fa-helicopter me-2"></i>
          Drone Log Book
        </h4>
      </div>

      <!-- Navigation -->
      <nav class="flex-grow-1 p-3">
        <ul class="nav nav-pills flex-column">
          <li class="nav-item mb-2">
            <router-link to="/" class="nav-link" active-class="active">
              <i class="fas fa-tachometer-alt me-2"></i>
              Dashboard
            </router-link>
          </li>
          <li class="nav-item mb-2">
            <a href="#" class="nav-link" @click="showFlightList = !showFlightList">
              <i class="fas fa-list me-2"></i>
              Flights
              <i class="fas fa-chevron-down ms-auto" :class="{ 'rotate-180': showFlightList }"></i>
            </a>
            <div v-show="showFlightList" class="ms-3 mt-2">
              <a href="#" class="nav-link nav-link-sm py-1">All Flights</a>
              <a href="#" class="nav-link nav-link-sm py-1">Recent</a>
              <a href="#" class="nav-link nav-link-sm py-1">Favorites</a>
            </div>
          </li>
          <li class="nav-item mb-2">
            <router-link to="/compare" class="nav-link" active-class="active">
              <i class="fas fa-balance-scale me-2"></i>
              Compare Flights
              <span v-if="selectedFlights.length > 0" class="badge bg-light text-dark ms-2">
                {{ selectedFlights.length }}
              </span>
            </router-link>
          </li>
          <li class="nav-item mb-2">
            <a href="#" class="nav-link">
              <i class="fas fa-chart-line me-2"></i>
              Analytics
            </a>
          </li>
          <li class="nav-item mb-2">
            <a href="#" class="nav-link">
              <i class="fas fa-plane me-2"></i>
              Aircraft
            </a>
          </li>
          <li class="nav-item mb-2">
            <a href="#" class="nav-link">
              <i class="fas fa-cog me-2"></i>
              Settings
            </a>
          </li>
        </ul>
      </nav>

      <!-- Footer -->
      <div class="p-3 border-top">
        <small class="text-light opacity-75">
          <i class="fas fa-info-circle me-1"></i>
          Version 1.0.0
        </small>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Header -->
      <header class="content-header">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2 class="mb-0">{{ pageTitle }}</h2>
            <small class="text-muted">{{ pageSubtitle }}</small>
          </div>
          <div class="d-flex align-items-center gap-3">
            <!-- Search -->
            <div class="input-group" style="width: 300px;">
              <span class="input-group-text">
                <i class="fas fa-search"></i>
              </span>
              <input 
                type="text" 
                class="form-control" 
                placeholder="Search flights..." 
                v-model="searchQuery"
                @input="handleSearch"
              >
            </div>
            
            <!-- User Menu -->
            <div class="dropdown">
              <button 
                class="btn btn-outline-secondary dropdown-toggle" 
                type="button" 
                data-bs-toggle="dropdown"
              >
                <i class="fas fa-user me-2"></i>
                {{ currentUser || 'User' }}
              </button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#"><i class="fas fa-user me-2"></i>Profile</a></li>
                <li><a class="dropdown-item" href="#"><i class="fas fa-cog me-2"></i>Settings</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" @click="logout"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div class="container-fluid p-4">
        <!-- Stats Cards -->
        <div class="row mb-4">
          <div class="col-md-3">
            <div class="widget">
              <div class="widget-content text-center">
                <div class="display-6 text-primary mb-2">
                  <i class="fas fa-plane"></i>
                </div>
                <h3 class="mb-1">{{ totalFlights }}</h3>
                <p class="text-muted mb-0">Total Flights</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="widget">
              <div class="widget-content text-center">
                <div class="display-6 text-success mb-2">
                  <i class="fas fa-clock"></i>
                </div>
                <h3 class="mb-1">{{ formatFlightTime(totalFlightTime) }}</h3>
                <p class="text-muted mb-0">Flight Time</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="widget">
              <div class="widget-content text-center">
                <div class="display-6 text-warning mb-2">
                  <i class="fas fa-helicopter"></i>
                </div>
                <h3 class="mb-1">{{ activeAircraft }}</h3>
                <p class="text-muted mb-0">Active Aircraft</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="widget">
              <div class="widget-content text-center">
                <div class="display-6 text-info mb-2">
                  <i class="fas fa-users"></i>
                </div>
                <h3 class="mb-1">{{ activePilots }}</h3>
                <p class="text-muted mb-0">Active Pilots</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Router View -->
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useFlightStore } from '@/stores/flight'
import dronelogbookAPI from '@/services/dronelogbook-api'

export default {
  name: 'DashboardLayout',
  setup() {
    const route = useRoute()
    const flightStore = useFlightStore()
    
    // Local state
    const showFlightList = ref(false)
    const searchQuery = ref('')
    const currentUser = ref('Demo User')
    const activeAircraft = ref(12)
    const activePilots = ref(8)

    // Computed properties
    const pageTitle = computed(() => {
      const routeMap = {
        'Dashboard': 'Dashboard',
        'FlightAnalysis': 'Flight Analysis',
        'FlightComparison': 'Flight Comparison'
      }
      return routeMap[route.name] || 'Dashboard'
    })

    const pageSubtitle = computed(() => {
      const subtitleMap = {
        'Dashboard': 'Overview of your flight operations',
        'FlightAnalysis': 'Detailed flight data analysis',
        'FlightComparison': 'Compare multiple flights'
      }
      return subtitleMap[route.name] || ''
    })

    const totalFlights = computed(() => flightStore.totalFlights)
    const totalFlightTime = computed(() => flightStore.totalFlightTime)
    const selectedFlights = computed(() => flightStore.selectedFlights)

    // Methods
    const formatFlightTime = (seconds) => {
      if (!seconds) return '0h 0m'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }

    const handleSearch = () => {
      // Implement search functionality
      console.log('Searching for:', searchQuery.value)
    }

    const logout = async () => {
      try {
        await dronelogbookAPI.logout()
        // Redirect to login page
        window.location.href = '/login'
      } catch (error) {
        console.error('Logout failed:', error)
      }
    }

    // Load initial data
    onMounted(async () => {
      try {
        flightStore.setLoading(true)
        const flights = await dronelogbookAPI.getFlights({ limit: 100 })
        flightStore.setFlights(flights.data || [])
      } catch (error) {
        flightStore.setError(error.message)
      } finally {
        flightStore.setLoading(false)
      }
    })

    return {
      // Local state
      showFlightList,
      searchQuery,
      currentUser,
      activeAircraft,
      activePilots,
      
      // Computed
      pageTitle,
      pageSubtitle,
      totalFlights,
      totalFlightTime,
      selectedFlights,
      
      // Methods
      formatFlightTime,
      handleSearch,
      logout
    }
  }
}
</script>

<style scoped>
.nav-link-sm {
  font-size: 0.875rem;
  padding-left: 1rem !important;
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

.badge {
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .content-header .d-flex {
    flex-direction: column;
    gap: 1rem;
  }
  
  .input-group {
    width: 100% !important;
  }
}
</style>