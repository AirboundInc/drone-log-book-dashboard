<template>
  <div class="flight-list">
    <!-- Loading State -->
    <div v-if="loading" class="loading-spinner">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading flights...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="flights.length === 0" class="text-center py-5">
      <i class="fas fa-plane-slash display-1 text-muted mb-3"></i>
      <h5 class="text-muted">No flights found</h5>
      <p class="text-muted">Try adjusting your filters or upload some flight logs.</p>
    </div>

    <!-- Flight List -->
    <div v-else class="table-responsive">
      <table class="table table-hover">
        <thead class="table-light">
          <tr>
            <th width="40">
              <input 
                type="checkbox" 
                class="form-check-input" 
                @change="toggleSelectAll"
                :checked="allSelected"
                :indeterminate="someSelected"
              >
            </th>
            <th>Flight</th>
            <th>Aircraft</th>
            <th>Pilot</th>
            <th>Duration</th>
            <th>Distance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="flight in flights" 
            :key="flight.id"
            class="flight-row"
            @click="handleRowClick(flight)"
          >
            <td @click.stop>
              <input 
                type="checkbox" 
                class="form-check-input"
                :checked="isSelected(flight.id)"
                @change="toggleSelection(flight)"
              >
            </td>
            <td>
              <div class="d-flex align-items-center">
                <div class="me-3">
                  <i class="fas fa-plane text-primary"></i>
                </div>
                <div>
                  <div class="fw-bold">{{ flight.name || `Flight ${flight.id}` }}</div>
                  <small class="text-muted">
                    {{ formatDate(flight.date) }} {{ formatTime(flight.start_time) }}
                  </small>
                </div>
              </div>
            </td>
            <td>
              <div class="d-flex align-items-center">
                <i class="fas fa-helicopter me-2 text-warning"></i>
                <div>
                  <div>{{ flight.aircraft_name || 'Unknown Aircraft' }}</div>
                  <small class="text-muted">{{ flight.aircraft_model }}</small>
                </div>
              </div>
            </td>
            <td>
              <div class="d-flex align-items-center">
                <i class="fas fa-user me-2 text-info"></i>
                {{ flight.pilot_name || 'Unknown Pilot' }}
              </div>
            </td>
            <td>
              <span class="badge bg-light text-dark">
                {{ formatDuration(flight.duration) }}
              </span>
            </td>
            <td>
              <span class="badge bg-light text-dark">
                {{ formatDistance(flight.distance) }}
              </span>
            </td>
            <td>
              <span 
                class="badge"
                :class="getStatusClass(flight.status)"
              >
                {{ getStatusText(flight.status) }}
              </span>
            </td>
            <td @click.stop>
              <div class="btn-group btn-group-sm">
                <button 
                  class="btn btn-outline-primary"
                  @click="$emit('flight-selected', flight)"
                  title="View Details"
                >
                  <i class="fas fa-eye"></i>
                </button>
                <button 
                  class="btn btn-outline-success"
                  @click="$emit('add-to-comparison', flight)"
                  :disabled="isInComparison(flight.id)"
                  title="Add to Comparison"
                >
                  <i class="fas fa-balance-scale"></i>
                </button>
                <div class="dropdown">
                  <button 
                    class="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split" 
                    data-bs-toggle="dropdown"
                    title="More Actions"
                  >
                    <i class="fas fa-ellipsis-v"></i>
                  </button>
                  <ul class="dropdown-menu">
                    <li>
                      <a class="dropdown-item" href="#" @click="downloadFlight(flight)">
                        <i class="fas fa-download me-2"></i>Download Log
                      </a>
                    </li>
                    <li>
                      <a class="dropdown-item" href="#" @click="shareFlight(flight)">
                        <i class="fas fa-share me-2"></i>Share
                      </a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                      <a class="dropdown-item text-danger" href="#" @click="deleteFlight(flight)">
                        <i class="fas fa-trash me-2"></i>Delete
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="flights.length > 0" class="d-flex justify-content-between align-items-center mt-3">
      <div class="text-muted">
        Showing {{ Math.min(flights.length, pageSize) }} of {{ totalFlights }} flights
      </div>
      <nav>
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <a class="page-link" href="#" @click.prevent="changePage(currentPage - 1)">
              <i class="fas fa-chevron-left"></i>
            </a>
          </li>
          <li 
            v-for="page in visiblePages" 
            :key="page"
            class="page-item" 
            :class="{ active: page === currentPage }"
          >
            <a class="page-link" href="#" @click.prevent="changePage(page)">
              {{ page }}
            </a>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <a class="page-link" href="#" @click.prevent="changePage(currentPage + 1)">
              <i class="fas fa-chevron-right"></i>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useFlightStore } from '@/stores/flight'
import dronelogbookAPI from '@/services/dronelogbook-api'

export default {
  name: 'FlightList',
  props: {
    flights: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['flight-selected', 'add-to-comparison'],
  setup(props, { emit }) {
    const flightStore = useFlightStore()
    
    // Local state
    const selectedItems = ref(new Set())
    const currentPage = ref(1)
    const pageSize = ref(10)

    // Computed properties
    const totalFlights = computed(() => props.flights.length)
    const totalPages = computed(() => Math.ceil(totalFlights.value / pageSize.value))
    
    const visiblePages = computed(() => {
      const pages = []
      const start = Math.max(1, currentPage.value - 2)
      const end = Math.min(totalPages.value, currentPage.value + 2)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      return pages
    })

    const allSelected = computed(() => {
      return props.flights.length > 0 && selectedItems.value.size === props.flights.length
    })

    const someSelected = computed(() => {
      return selectedItems.value.size > 0 && selectedItems.value.size < props.flights.length
    })

    // Methods
    const isSelected = (flightId) => {
      return selectedItems.value.has(flightId)
    }

    const isInComparison = (flightId) => {
      return flightStore.selectedFlights.some(f => f.id === flightId)
    }

    const toggleSelection = (flight) => {
      if (selectedItems.value.has(flight.id)) {
        selectedItems.value.delete(flight.id)
      } else {
        selectedItems.value.add(flight.id)
      }
    }

    const toggleSelectAll = () => {
      if (allSelected.value) {
        selectedItems.value.clear()
      } else {
        props.flights.forEach(flight => {
          selectedItems.value.add(flight.id)
        })
      }
    }

    const handleRowClick = (flight) => {
      emit('flight-selected', flight)
    }

    const changePage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString()
    }

    const formatTime = (timeString) => {
      if (!timeString) return ''
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

    const getStatusClass = (status) => {
      const statusMap = {
        'completed': 'bg-success',
        'error': 'bg-danger',
        'analyzing': 'bg-warning',
        'uploading': 'bg-info',
        'pending': 'bg-secondary'
      }
      return statusMap[status] || 'bg-secondary'
    }

    const getStatusText = (status) => {
      const statusMap = {
        'completed': 'Completed',
        'error': 'Error',
        'analyzing': 'Analyzing',
        'uploading': 'Uploading',
        'pending': 'Pending'
      }
      return statusMap[status] || 'Unknown'
    }

    const downloadFlight = async (flight) => {
      try {
        await dronelogbookAPI.downloadFlightLog(flight.id, 'csv')
      } catch (error) {
        console.error('Download failed:', error)
        // Show error notification
      }
    }

    const shareFlight = (flight) => {
      // Implement sharing functionality
      const url = `${window.location.origin}/flight/${flight.id}`
      navigator.clipboard.writeText(url).then(() => {
        // Show success notification
        console.log('Flight URL copied to clipboard')
      })
    }

    const deleteFlight = (flight) => {
      // Show confirmation dialog
      if (confirm(`Are you sure you want to delete flight "${flight.name || flight.id}"?`)) {
        // Implement delete functionality
        console.log('Deleting flight:', flight.id)
      }
    }

    return {
      // Local state
      selectedItems,
      currentPage,
      pageSize,
      
      // Computed
      totalFlights,
      totalPages,
      visiblePages,
      allSelected,
      someSelected,
      
      // Methods
      isSelected,
      isInComparison,
      toggleSelection,
      toggleSelectAll,
      handleRowClick,
      changePage,
      formatDate,
      formatTime,
      formatDuration,
      formatDistance,
      getStatusClass,
      getStatusText,
      downloadFlight,
      shareFlight,
      deleteFlight
    }
  }
}
</script>

<style scoped>
.flight-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.flight-row:hover {
  background-color: rgba(0, 123, 255, 0.05);
}

.btn-group-sm .btn {
  padding: 0.25rem 0.4rem;
}

.dropdown-toggle::after {
  display: none;
}

.pagination-sm .page-link {
  padding: 0.25rem 0.5rem;
}

.table th {
  border-top: none;
  font-weight: 600;
  color: #495057;
}

.loading-spinner {
  height: 200px;
}
</style>