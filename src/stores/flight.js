import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useFlightStore = defineStore('flight', () => {
  // State
  const flights = ref([])
  const currentFlight = ref(null)
  const selectedFlights = ref([])
  const loading = ref(false)
  const error = ref(null)
  const filters = ref({
    dateRange: null,
    aircraft: null,
    pilot: null,
    status: null
  })

  // Getters
  const filteredFlights = computed(() => {
    let result = flights.value

    if (filters.value.aircraft) {
      result = result.filter(flight => 
        flight.aircraft_name?.toLowerCase().includes(filters.value.aircraft.toLowerCase())
      )
    }

    if (filters.value.pilot) {
      result = result.filter(flight => 
        flight.pilot_name?.toLowerCase().includes(filters.value.pilot.toLowerCase())
      )
    }

    if (filters.value.status) {
      result = result.filter(flight => flight.status === filters.value.status)
    }

    if (filters.value.dateRange && filters.value.dateRange.length === 2) {
      const [start, end] = filters.value.dateRange
      result = result.filter(flight => {
        const flightDate = new Date(flight.date)
        return flightDate >= start && flightDate <= end
      })
    }

    return result
  })

  const totalFlightTime = computed(() => {
    return flights.value.reduce((total, flight) => {
      return total + (flight.duration || 0)
    }, 0)
  })

  const totalFlights = computed(() => flights.value.length)

  // Actions
  const setFlights = (flightData) => {
    flights.value = flightData
  }

  const setCurrentFlight = (flight) => {
    currentFlight.value = flight
  }

  const addToComparison = (flight) => {
    if (selectedFlights.value.length < 4 && !selectedFlights.value.find(f => f.id === flight.id)) {
      selectedFlights.value.push(flight)
    }
  }

  const removeFromComparison = (flightId) => {
    const index = selectedFlights.value.findIndex(f => f.id === flightId)
    if (index > -1) {
      selectedFlights.value.splice(index, 1)
    }
  }

  const clearComparison = () => {
    selectedFlights.value = []
  }

  const setLoading = (state) => {
    loading.value = state
  }

  const setError = (errorMessage) => {
    error.value = errorMessage
  }

  const clearError = () => {
    error.value = null
  }

  const updateFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const clearFilters = () => {
    filters.value = {
      dateRange: null,
      aircraft: null,
      pilot: null,
      status: null
    }
  }

  return {
    // State
    flights,
    currentFlight,
    selectedFlights,
    loading,
    error,
    filters,
    
    // Getters
    filteredFlights,
    totalFlightTime,
    totalFlights,
    
    // Actions
    setFlights,
    setCurrentFlight,
    addToComparison,
    removeFromComparison,
    clearComparison,
    setLoading,
    setError,
    clearError,
    updateFilters,
    clearFilters
  }
})