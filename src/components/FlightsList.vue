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
          <col style="width: 5%">
          <col style="width: 23%">
          <col style="width: 11%">
          <col style="width: 11%">
          <col style="width: 11%">
          <col style="width: 11%">
          <col style="width: 28%">
        </colgroup>
        <thead>
          <tr class="table-header">
            <th scope="col">
              <input 
                type="checkbox" 
                @change="toggleSelectAll" 
                :checked="isAllSelected"
                title="Select/Deselect all flights"
              />
            </th>
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
            <td>
              <input 
                type="checkbox" 
                v-model="selectedFlights" 
                :value="flight.id"
                @change="updateSelectAllState"
              />
            </td>
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
          :disabled="currentPage === 1 || loadingAll"
          title="Go to previous page"
        >
          <i class="fas fa-chevron-left"></i> Previous
        </button>
        <span class="page-indicator">Page {{ currentPage }}</span>
        <button
          class="btn btn-secondary"
          @click="goToNextPage"
          :disabled="!hasNextPage || loadingAll"
          title="Go to next page"
        >
          Next <i class="fas fa-chevron-right"></i>
        </button>
        <button
          class="btn btn-primary ms-3"
          @click="loadAllFlights"
          :disabled="loadingAll || !hasNextPage"
          title="Load all flights from all pages"
        >
          <span v-if="loadingAll">
            <i class="fas fa-spinner fa-spin"></i> Loading... ({{ loadedPages }}/?)
          </span>
          <span v-else>
            <i class="fas fa-download"></i> Load All Flights
          </span>
        </button>
        <button
          class="btn btn-success ms-2"
          @click="downloadAllLogs"
          :disabled="downloadingAll"
          title="Download all flight logs as a zip file"
        >
          <span v-if="downloadingAll">
            <i class="fas fa-spinner fa-spin"></i> Downloading...
          </span>
          <span v-else>
            <i class="fas fa-file-archive"></i> Download All Logs
          </span>
        </button>
        <button
          class="btn btn-warning ms-2"
          @click="downloadSelectedLogs"
          :disabled="selectedFlights.length === 0 || downloadingSelected"
          :title="selectedFlights.length === 0 ? 'Select flights to download' : `Download ${selectedFlights.length} selected flight(s)`"
        >
          <span v-if="downloadingSelected">
            <i class="fas fa-spinner fa-spin"></i> Downloading...
          </span>
          <span v-else>
            <i class="fas fa-check-square"></i> Download Selected ({{ selectedFlights.length }})
          </span>
        </button>
      </div>

      <!-- Download Progress -->
      <div v-if="downloadProgress.isDownloading" class="download-progress-section mt-3">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">
              <i class="fas fa-download fa-spin"></i> {{ downloadProgress.type === 'all' ? 'Downloading All Logs' : 'Downloading Selected Logs' }}
            </h5>
            <p class="mb-2">
              <strong>{{ downloadProgress.currentFile }}</strong>
              <span v-if="downloadProgress.currentFileSize" class="text-muted ms-2">
                ({{ downloadProgress.currentFileSize }})
              </span>
            </p>
            <div class="progress" style="height: 25px;">
              <div 
                class="progress-bar progress-bar-striped progress-bar-animated" 
                role="progressbar" 
                :style="{ width: downloadProgress.percentage + '%' }"
                :aria-valuenow="downloadProgress.percentage" 
                aria-valuemin="0" 
                aria-valuemax="100"
              >
                {{ downloadProgress.current }} / {{ downloadProgress.total }} ({{ downloadProgress.percentage }}%)
              </div>
            </div>
            <small class="text-muted mt-2 d-block">
              {{ downloadProgress.successCount }} succeeded, {{ downloadProgress.errorCount }} failed
            </small>
          </div>
        </div>
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
import { fetchFlightLogsForDrone, fetchAllFlightLogs, getFlightDetailUrl } from '../services/flight-logs'

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
    const loadingAll = ref(false)
    const loadedPages = ref(0)
    const downloadingAll = ref(false)
    const selectedFlights = ref([])
    const isAllSelected = ref(false)
    const downloadingSelected = ref(false)
    const downloadProgress = ref({
      isDownloading: false,
      type: '', // 'all' or 'selected'
      current: 0,
      total: 0,
      percentage: 0,
      currentFile: '',
      currentFileSize: '',
      successCount: 0,
      errorCount: 0
    })

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
        console.log(`🔍 First 3 flight IDs:`, result.flights.slice(0, 3).map(f => f.id))
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

    const loadAllFlights = async () => {
      if (!props.droneId) {
        error.value = 'No drone ID provided'
        return
      }

      loadingAll.value = true
      loadedPages.value = 0
      error.value = null
      
      // Keep current page 1 flights, we'll append to them
      const initialFlights = [...flights.value]
      flights.value = []

      try {
        console.log(`📥 Loading ALL flights for drone: ${props.droneId}`)
        
        await fetchAllFlightLogs(props.droneId, (pageFlights, pageNum) => {
          loadedPages.value = pageNum
          console.log(`✅ Page ${pageNum} loaded with ${pageFlights.length} flights`)
          
          // Append new flights to the list
          flights.value = [...flights.value, ...pageFlights]
        })
        
        console.log(`🎉 All flights loaded! Total: ${flights.value.length}`)
        
        // After loading all, disable pagination
        hasNextPage.value = false
        currentPage.value = 1  // Reset to show we're viewing "all"
        
      } catch (err) {
        error.value = err.message || 'Failed to load all flights'
        console.error('❌ Failed to load all flights:', err)
        // Restore initial flights on error
        flights.value = initialFlights
      } finally {
        loadingAll.value = false
      }
    }

    const openFlightDetail = (flight) => {
      const detailUrl = getFlightDetailUrl(flight.id)
      window.open(detailUrl, '_blank')
    }

    const toggleSelectAll = (event) => {
      if (event.target.checked) {
        selectedFlights.value = flights.value.map(f => f.id)
        isAllSelected.value = true
      } else {
        selectedFlights.value = []
        isAllSelected.value = false
      }
    }

    const updateSelectAllState = () => {
      isAllSelected.value = selectedFlights.value.length === flights.value.length && flights.value.length > 0
    }

    const downloadSelectedLogs = async () => {
      if (selectedFlights.value.length === 0) {
        console.log('No flights selected')
        return
      }

      console.log(`📦 Downloading ${selectedFlights.value.length} selected logs...`)
      downloadingSelected.value = true
      
      // Initialize progress
      downloadProgress.value = {
        isDownloading: true,
        type: 'selected',
        current: 0,
        total: selectedFlights.value.length,
        percentage: 0,
        currentFile: `Preparing to download ${selectedFlights.value.length} flights...`,
        successCount: 0,
        errorCount: 0
      }

      try {
        // Use EventSource for real-time progress updates
        const flightIds = selectedFlights.value.join(',')
        const progressUrl = `/api/flights/download-selected-logs-progress?flightIds=${encodeURIComponent(flightIds)}`
        const eventSource = new EventSource(progressUrl)
        
        let downloadStarted = false
        
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data)
          
          if (data.type === 'progress') {
            downloadProgress.value.current = data.current
            downloadProgress.value.currentFile = data.message
            downloadProgress.value.percentage = Math.round((data.current / downloadProgress.value.total) * 100)
            downloadProgress.value.currentFileSize = ''
          } else if (data.type === 'downloading') {
            // Real-time download progress with KB count
            downloadProgress.value.currentFile = data.message
            downloadProgress.value.currentFileSize = data.downloadedKB ? `${data.downloadedKB} KB` : ''
          } else if (data.type === 'success') {
            downloadProgress.value.successCount++
            // Update to show completed file with size
            if (data.fileName) {
              downloadProgress.value.currentFile = `✅ ${data.fileName}`
              downloadProgress.value.currentFileSize = data.fileSize || ''
            }
          } else if (data.type === 'error') {
            downloadProgress.value.errorCount++
          } else if (data.type === 'complete') {
            eventSource.close()
            
            if (!downloadStarted && data.downloadToken) {
              downloadStarted = true
              downloadProgress.value.currentFile = 'Creating ZIP file...'
              downloadProgress.value.percentage = 100
              
              // Now fetch the actual file using the download token
              const downloadUrl = `/api/flights/download-selected-logs?downloadToken=${encodeURIComponent(data.downloadToken)}`
              
              fetch(downloadUrl)
                .then(response => {
                  if (!response.ok) throw new Error('Download failed')
                  return response.blob()
                })
                .then(blob => {
                  // Create download link
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `selected-logs-${Date.now()}.zip`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                  
                  downloadProgress.value.currentFile = `✅ Downloaded ${downloadProgress.value.successCount} flights!`
                  
                  // Clear progress after delay
                  setTimeout(() => {
                    downloadProgress.value.isDownloading = false
                    downloadingSelected.value = false
                  }, 3000)
                })
                .catch(err => {
                  console.error('❌ Download failed:', err)
                  error.value = 'Failed to download ZIP file'
                  downloadProgress.value.isDownloading = false
                  downloadingSelected.value = false
                })
            }
          }
        }
        
        eventSource.onerror = (err) => {
          console.error('❌ EventSource error:', err)
          eventSource.close()
          error.value = 'Download progress tracking failed'
          downloadProgress.value.isDownloading = false
          downloadingSelected.value = false
        }
        
      } catch (err) {
        console.error('❌ Download selected logs error:', err)
        error.value = 'Failed to download selected logs'
        downloadProgress.value.isDownloading = false
        downloadingSelected.value = false
      }
    }

    const downloadAllLogs = async () => {
      if (!props.droneId) {
        alert('No drone ID provided')
        return
      }

      downloadingAll.value = true
      
      // Initialize progress
      downloadProgress.value = {
        isDownloading: true,
        type: 'all',
        current: 0,
        total: 0,
        percentage: 0,
        currentFile: 'Preparing to download all flights...',
        currentFileSize: '',
        successCount: 0,
        errorCount: 0
      }

      try {
        console.log(`📦 Downloading all logs for drone: ${props.droneId}`)
        
        // Use EventSource for real-time progress updates
        const progressUrl = `/api/flights/download-all-logs-progress?droneId=${encodeURIComponent(props.droneId)}`
        const eventSource = new EventSource(progressUrl)
        
        let downloadStarted = false
        
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data)
          
          if (data.type === 'progress') {
            if (data.total) {
              downloadProgress.value.total = data.total
            }
            downloadProgress.value.current = data.current
            downloadProgress.value.currentFile = data.message
            downloadProgress.value.percentage = data.total ? Math.round((data.current / data.total) * 100) : 0
            downloadProgress.value.currentFileSize = ''
          } else if (data.type === 'downloading') {
            // Real-time download progress with KB count
            downloadProgress.value.currentFile = data.message
            downloadProgress.value.currentFileSize = data.downloadedKB ? `${data.downloadedKB} KB` : ''
          } else if (data.type === 'success') {
            downloadProgress.value.successCount++
            if (data.fileName) {
              downloadProgress.value.currentFile = `✅ ${data.fileName}`
              downloadProgress.value.currentFileSize = data.fileSize || ''
            }
          } else if (data.type === 'error') {
            downloadProgress.value.errorCount++
          } else if (data.type === 'complete') {
            eventSource.close()
            
            if (!downloadStarted && data.downloadToken) {
              downloadStarted = true
              downloadProgress.value.currentFile = 'Creating ZIP file...'
              downloadProgress.value.percentage = 100
              
              // Now fetch the actual file using the download token
              const downloadUrl = `/api/flights/download-all-logs?downloadToken=${encodeURIComponent(data.downloadToken)}`
              
              fetch(downloadUrl)
                .then(response => {
                  if (!response.ok) throw new Error(`HTTP ${response.status}`)
                  return response.blob()
                })
                .then(blob => {
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `all-logs-${Date.now()}.zip`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                  
                  downloadProgress.value.currentFile = `✅ Downloaded ${downloadProgress.value.successCount} flights!`
                  
                  // Clear progress after delay
                  setTimeout(() => {
                    downloadProgress.value.isDownloading = false
                    downloadingAll.value = false
                  }, 3000)
                })
                .catch(err => {
                  console.error('❌ Download failed:', err)
                  error.value = 'Failed to download ZIP file'
                  downloadProgress.value.isDownloading = false
                  downloadingAll.value = false
                })
            }
          }
        }
        
        eventSource.onerror = (err) => {
          console.error('❌ EventSource error:', err)
          eventSource.close()
          error.value = 'Download progress tracking failed'
          downloadProgress.value.isDownloading = false
          downloadingAll.value = false
        }
        
      } catch (err) {
        console.error('❌ Download all failed:', err)
        alert(`Failed to download all logs: ${err.message}`)
        downloadProgress.value.isDownloading = false
        downloadingAll.value = false
      }
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
      loadingAll,
      loadedPages,
      downloadingAll,
      selectedFlights,
      isAllSelected,
      downloadingSelected,
      downloadProgress,
      loadFlights,
      loadAllFlights,
      downloadLog,
      downloadAllLogs,
      downloadSelectedLogs,
      toggleSelectAll,
      updateSelectAllState,
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
