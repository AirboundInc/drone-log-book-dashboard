<template>
  <div class="drone-detail-container">
    <!-- Header -->
    <div class="detail-header">
      <router-link to="/drones" class="back-button">
        <i class="fas fa-arrow-left"></i> Back to Inventory
      </router-link>
      <h1 v-if="droneName" class="drone-title">🚁 {{ droneName }}</h1>
      <h1 v-else class="drone-title">🚁 Drone Details</h1>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading drone details...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
      <strong>Error:</strong> {{ error }}
      <button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <!-- Content -->
    <div v-if="!loading && !error" class="detail-content">
      <!-- Flights List -->
      <FlightsList
        :droneId="droneId"
        :droneName="droneName"
      />
    </div>

    <!-- Retry Button -->
    <div v-if="!loading && error" class="retry-section">
      <button class="btn btn-secondary" @click="fetchDroneDetail">
        Retry Loading Details
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import FlightsList from './FlightsList.vue'

export default {
  name: 'DroneDetail',
  components: {
    FlightsList
  },
  setup() {
    const route = useRoute()
    const droneId = ref(route.params.id || route.query.id)
    const droneName = ref(route.params.name || route.query.name || '')
    const loading = ref(false)
    const error = ref(null)

    const fetchDroneDetail = async () => {
      if (!droneId.value) {
        error.value = 'No drone ID provided'
        return
      }

      loading.value = true
      error.value = null

      try {
        console.log(`🚁 Fetching drone detail for ID: ${droneId.value}`)
        
        // Just verify the endpoint is accessible
        const response = await fetch(`/api/drones/detail?id=${encodeURIComponent(droneId.value)}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch drone details: ${response.status}`)
        }

        console.log(`✅ Drone detail endpoint is accessible`)
      } catch (err) {
        error.value = err.message
        console.error('❌ Failed to fetch drone detail:', err)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      // The iframe will load the drone detail directly
      // We just validate that the endpoint is reachable
      if (droneId.value) {
        // Try to fetch to check if authenticated
        fetch(`/api/drones/detail?id=${encodeURIComponent(droneId.value)}`, { method: 'HEAD' })
          .catch(err => {
            console.warn('Drone detail endpoint may not be accessible:', err)
          })
      }
    })

    return {
      droneId,
      droneName,
      loading,
      error,
      fetchDroneDetail
    }
  }
}
</script>

<style scoped>
.drone-detail-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 1rem;
}

.detail-header {
  max-width: 1400px;
  margin: 0 auto 2rem;
  color: white;
}

.back-button {
  display: inline-block;
  color: white;
  text-decoration: none;
  font-size: 1rem;
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  transition: all 0.3s ease;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-5px);
}

.drone-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

/* Loading State */
.loading-state {
  text-align: center;
  color: white;
  padding: 3rem;
  max-width: 1400px;
  margin: 0 auto;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Content */
.detail-content {
  max-width: 1400px;
  margin: 0 auto;
}

/* Error State */
.alert {
  max-width: 1400px;
  margin: 0 auto 2rem;
}

/* Retry Section */
.retry-section {
  text-align: center;
  margin-top: 2rem;
}

.btn-secondary {
  padding: 0.75rem 2rem;
  font-weight: 600;
  border-radius: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .drone-detail-container {
    padding: 1rem;
  }

  .drone-title {
    font-size: 1.75rem;
  }

  .drone-frame {
    height: 600px;
  }
}
</style>
