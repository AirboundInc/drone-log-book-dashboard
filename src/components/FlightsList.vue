<template>
  <div class="flights-list-container">
    <h2 class="section-title">🛩️ Flight Logs</h2>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading flight list...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
      <strong>Error:</strong> {{ error }}
      <button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !error && flights.length === 0" class="alert alert-info">
      <i class="fas fa-info-circle"></i> No flights found for this drone.
    </div>

    <!-- Flights Table -->
    <div v-if="!loading && !error && flights.length > 0" class="table-responsive">
      <table class="table table-striped table-hover">
        <colgroup>
          <col style="width: 25%">
          <col style="width: 12%">
          <col style="width: 12%">
          <col style="width: 12%">
          <col style="width: 12%">
          <col style="width: 27%">
        </colgroup>
        <thead>
          <tr class="table-header">
            <th scope="col">Flight Name</th>
            <th scope="col">Duration</th>
            <th scope="col">Date</th>
            <th scope="col">Time</th>
            <th scope="col">Pilot</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="flight in flights" :key="flight.id" class="flight-row">
            <td class="flight-name">{{ flight.name }}</td>
            <td class="flight-duration">{{ flight.duration || '-' }}</td>
            <td class="flight-date">{{ flight.date || '-' }}</td>
            <td class="flight-time">{{ flight.time || '-' }}</td>
            <td class="flight-pilot">{{ flight.pilot || '-' }}</td>
            <td class="actions">
              <button
                class="btn btn-sm btn-primary me-2"
                @click="downloadLog(flight)"
                title="Download flight log (.bin file)"
              >
                <i class="fas fa-download"></i> Download Log
              </button>
              <button
                class="btn btn-sm btn-info"
                @click="openFlightDetail(flight)"
                title="View flight details on Drone Logbook"
              >
                <i class="fas fa-external-link-alt"></i> Details
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination Controls -->
      <div class="pagination-controls">
        <button
          class="btn btn-secondary"
          @click="goToPreviousPage"
          :disabled="currentPage === 1"
          title="Go to previous page"
        >
          <i class="fas fa-chevron-left"></i> Previous
        </button>
        <span class="page-indicator">Page {{ currentPage }}</span>
        <button
          class="btn btn-secondary"
          @click="goToNextPage"
          :disabled="!hasNextPage"
          title="Go to next page"
        >
          Next <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Retry Button -->
    <div v-if="error && !loading" class="retry-section">
      <button class="btn btn-secondary" @click="loadFlights">
        Retry Loading Flights
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { fetchFlightLogsForDrone, getFlightDetailUrl } from '../services/flight-logs'

export default {
  name: 'FlightsList',
  props: {
    droneId: {
      type: String,
      required: true
    },
    droneName: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const flights = ref([])
    const loading = ref(false)
    const error = ref(null)
    const currentPage = ref(1)
    const hasNextPage = ref(false)

    const loadFlights = async () => {
      if (!props.droneId) {
        error.value = 'No drone ID provided'
        console.warn('⚠️ No droneId prop provided to FlightsList')
        return
      }

      loading.value = true
      error.value = null
      flights.value = []

      try {
        console.log(`📝 FlightsList loading flights for drone: ${props.droneId}, page: ${currentPage.value}`)
        const result = await fetchFlightLogsForDrone(props.droneId, currentPage.value)
        console.log(`✅ Successfully loaded ${result.flights.length} flights`)
        flights.value = result.flights
        hasNextPage.value = result.hasNextPage
      } catch (err) {
        error.value = err.message || 'Failed to load flights'
        console.error('❌ Failed to load flights:', err)
      } finally {
        loading.value = false
      }
    }

    const goToNextPage = async () => {
      currentPage.value++
      await loadFlights()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const goToPreviousPage = async () => {
      if (currentPage.value > 1) {
        currentPage.value--
        await loadFlights()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    const downloadLog = async (flight) => {
      if (!flight.id) {
        alert('Flight ID is missing')
        return
      }

      try {
        console.log(`⬇️ Getting download link for flight: ${flight.id}`)
        
        const response = await fetch(`/api/flights/download-log?flightId=${encodeURIComponent(flight.id)}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Failed to get download link: ${response.status} - ${errorData.error || response.statusText}`)
        }

        const data = await response.json()
        
        if (data.downloadUrl) {
          console.log(`✅ Got download URL, opening: ${data.downloadUrl}`)
          
          // Create a temporary anchor element and click it to download
          const downloadLink = document.createElement('a')
          downloadLink.href = data.downloadUrl
          downloadLink.target = '_blank'
          downloadLink.setAttribute('download', '')
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)
          
          console.log(`✅ Download initiated`)
        } else {
          throw new Error('No download URL provided')
        }
      } catch (err) {
        console.error('❌ Download failed:', err)
        alert(`Download error: ${err.message}`)
      }
    }

    const openFlightDetail = (flight) => {
      const detailUrl = getFlightDetailUrl(flight.id)
      window.open(detailUrl, '_blank')
    }

    onMounted(() => {
      console.log('🚀 FlightsList mounted, loading flights...')
      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        loadFlights()
      }, 100)
    })

    return {
      flights,
      loading,
      error,
      currentPage,
      hasNextPage,
      loadFlights,
      downloadLog,
      openFlightDetail,
      goToNextPage,
      goToPreviousPage
    }
  }
}
</script>

<style scoped>
.flights-list-container {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #667eea;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Table Styles */
.table-responsive {
  overflow-x: auto;
}

.table {
  margin-bottom: 0;
}

.table-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.table-header th {
  border: none;
  padding: 1.25rem 0.75rem;
  vertical-align: middle;
  text-align: left;
  font-size: 0.9rem;
  font-weight: 600;
}

.table-header th:nth-child(2),
.table-header th:nth-child(3),
.table-header th:nth-child(4),
.table-header th:nth-child(5) {
  text-align: center;
}

.table-header th:nth-child(6) {
  text-align: right;
  padding-right: 1.5rem;
}

.flight-row {
  transition: background-color 0.2s ease;
}

.flight-row:hover {
  background-color: #f5f5f5;
}

.flight-row td {
  padding: 0.9rem 0.75rem;
  vertical-align: middle;
}

.flight-name {
  font-weight: 500;
  color: #333;
  word-break: break-word;
}

.flight-duration {
  text-align: center;
  font-size: 0.9rem;
  color: #555;
}

.flight-date {
  text-align: center;
  font-size: 0.9rem;
  color: #555;
}

.flight-time {
  text-align: center;
  font-size: 0.9rem;
  color: #555;
}

.flight-pilot {
  text-align: center;
  font-size: 0.9rem;
  color: #555;
}

.actions {
  text-align: right;
  padding-right: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.actions .btn {
  margin: 0 0.25rem;
  flex-shrink: 0;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.btn-info {
  background: #17a2b8;
  border: none;
}

.btn-info:hover {
  background: #138496;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(23, 162, 184, 0.4);
}

/* Alert Styles */
.alert {
  border-radius: 8px;
  padding: 1rem;
}

.alert-danger {
  background-color: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}

.alert-info {
  background-color: #d1ecf1;
  border-color: #bee5eb;
  color: #0c5460;
}

/* Retry Section */
.retry-section {
  text-align: center;
  padding: 1.5rem;
}

.btn-secondary {
  background-color: #6c757d;
  border: none;
  padding: 0.75rem 2rem;
  font-weight: 600;
  border-radius: 8px;
}

.btn-secondary:hover {
  background-color: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.4);
}

/* Responsive Design */
@media (max-width: 768px) {
  .flights-list-container {
    padding: 1rem;
  }

  .section-title {
    font-size: 1.25rem;
  }

  .table {
    font-size: 0.85rem;
  }

  .actions .btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .actions .btn i {
    margin-right: 0.25rem;
  }

  .flight-id {
    max-width: 100px;
  }
}

@media (max-width: 480px) {
  .flights-list-container {
    padding: 0.5rem;
  }

  .section-title {
    font-size: 1rem;
  }

  .table {
    font-size: 0.75rem;
  }

  .flight-name {
    max-width: 150px;
  }

  .actions {
    padding: 0.5rem;
  }

  .actions .btn {
    display: block;
    width: 100%;
    margin-bottom: 0.25rem;
    padding: 0.25rem;
    font-size: 0.65rem;
  }

  .actions .btn:last-child {
    margin-bottom: 0;
  }

  .actions .btn i {
    display: none;
  }
}

/* Pagination Controls */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
  margin-top: 1rem;
}

.page-indicator {
  font-weight: 600;
  color: #333;
  min-width: 80px;
  text-align: center;
}

.pagination-controls .btn {
  padding: 0.5rem 1.5rem;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.pagination-controls .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #ccc;
}

.pagination-controls .btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

@media (max-width: 480px) {
  .pagination-controls {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pagination-controls .btn {
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
  }
}
</style>
