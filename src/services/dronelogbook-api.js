import axios from 'axios'

// Base API configuration - now points to our proxy
const API_BASE_URL = '/api'

class DronelogbookAPI {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      withCredentials: true, // Include cookies for session management
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('dlb_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('dlb_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Authentication methods
  async login(email, password) {
    try {
      console.log('📡 Attempting login to:', `${API_BASE_URL}/auth/login`)
      
      const response = await this.client.post('/auth/login', {
        email,
        password
      })
      
      console.log('✅ Login response received:', response.status)
      
      if (response.data && response.data.access_token) {
        localStorage.setItem('dlb_token', response.data.access_token)
        console.log('🔑 Token stored successfully')
        return response.data
      }
      
      throw new Error('No access token received from server')
    } catch (error) {
      console.error('❌ Login error:', error)
      
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        throw new Error('Cannot connect to Dronelogbook API. Please check if the service is running and your internet connection.')
      }
      
      if (error.response) {
        const status = error.response.status
        const data = error.response.data
        
        console.error(`Server responded with ${status}:`, data)
        
        switch (status) {
          case 400:
            throw new Error(data?.message || 'Invalid request format')
          case 401:
            throw new Error('Invalid email or password')
          case 403:
            throw new Error('Access forbidden')
          case 404:
            throw new Error('Login endpoint not found - please verify the API URL')
          case 422:
            throw new Error(data?.message || 'Validation error')
          case 429:
            throw new Error('Too many login attempts')
          case 500:
            throw new Error('Server error - please try again later')
          default:
            throw new Error(data?.message || `Login failed (${status})`)
        }
      }
      
      if (error.request) {
        throw new Error('No response from server - please check if the API is accessible')
      }
      
      throw new Error(error.message || 'Unexpected error during login')
    }
  }

  async logout() {
    try {
      await this.client.post('/auth/logout')
    } catch (error) {
      console.warn('Logout request failed:', error)
    } finally {
      localStorage.removeItem('dlb_token')
    }
  }

  async getProfile() {
    try {
      const response = await this.client.get('/auth/profile')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch profile')
    }
  }

  // Flight data methods
  async getFlights(params = {}) {
    try {
      // Map periodDays to range for backend compatibility
      const queryParams = { ...params }
      if (params.periodDays) {
        queryParams.range = params.periodDays
        // Keep periodDays as well for backward compatibility
      }
      
      const response = await this.client.get('/flights', { params: queryParams })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch flights')
    }
  }

  async getFlight(flightId) {
    try {
      const response = await this.client.get(`/flights/${flightId}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch flight')
    }
  }

  async getFlightLogs(flightId, logType = 'telemetry') {
    try {
      const response = await this.client.get(`/flights/${flightId}/logs`, {
        params: { type: logType }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch flight logs')
    }
  }

  async getFlightTelemetry(flightId, startTime = null, endTime = null) {
    try {
      const params = {}
      if (startTime) params.start_time = startTime
      if (endTime) params.end_time = endTime
      
      const response = await this.client.get(`/flights/${flightId}/telemetry`, { params })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch telemetry data')
    }
  }

  async getFlightParameters(flightId) {
    try {
      const response = await this.client.get(`/flights/${flightId}/parameters`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch flight parameters')
    }
  }

  async getFlightEvents(flightId) {
    try {
      const response = await this.client.get(`/flights/${flightId}/events`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch flight events')
    }
  }

  // Aircraft and pilot data
  async getAircraft() {
    try {
      const response = await this.client.get('/aircraft')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch aircraft')
    }
  }

  async getPilots() {
    try {
      const response = await this.client.get('/pilots')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch pilots')
    }
  }

  // Statistics and analytics
  async getFlightStatistics(params = {}) {
    try {
      const response = await this.client.get('/statistics/flights', { params })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch flight statistics')
    }
  }

  async getStatistics(params = {}) {
    try {
      console.log('📊 Fetching statistics from proxy...')
      const response = await this.client.get('/statistics', { params })
      return response.data
    } catch (error) {
      console.warn('⚠️ Statistics endpoint not available:', error.message)
      // Return null so caller can fallback to calculating from flights
      return null
    }
  }

  async getAircraftUtilization(aircraftId = null, timeRange = '30d') {
    try {
      const params = { time_range: timeRange }
      if (aircraftId) params.aircraft_id = aircraftId
      
      const response = await this.client.get('/statistics/utilization', { params })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch utilization data')
    }
  }

  // File downloads
  async downloadFlightLog(flightId, format = 'csv') {
    try {
      const response = await this.client.get(`/flights/${flightId}/download`, {
        params: { format },
        responseType: 'blob'
      })
      
      // Create blob URL for download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `flight_${flightId}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      return true
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to download flight log')
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health')
      return response.data
    } catch (error) {
      throw new Error('API health check failed')
    }
  }

  // Utility methods
  isAuthenticated() {
    return !!localStorage.getItem('dlb_token')
  }

  getToken() {
    return localStorage.getItem('dlb_token')
  }
}

// Create singleton instance
const dronelogbookAPI = new DronelogbookAPI()

export default dronelogbookAPI