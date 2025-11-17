<template>
  <div class="drone-inventory-container">
    <!-- Header -->
    <div class="inventory-header">
      <h1 class="page-title">🚁 Drone Inventory</h1>
      <p class="subtitle">View and manage your drone fleet</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading drone inventory...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
      <strong>Error:</strong> {{ error }}
      <button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !error && filteredDrones.length === 0" class="alert alert-info">
      <i class="fas fa-info-circle"></i> No drones found in your inventory.
    </div>

    <!-- Content Area -->
    <div v-if="!loading && !error && filteredDrones.length > 0" class="content-area">
      <!-- Search and Filter Section -->
      <div class="search-section">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input
            v-model="searchQuery"
            type="text"
            class="form-control"
            placeholder="Search drones by name or ID..."
          />
        </div>

        <!-- Quick Select Dropdown -->
        <div class="quick-select">
          <select
            v-model="selectedDrone"
            class="form-select"
            @change="selectAndNavigate"
          >
            <option value="">Select a drone...</option>
            <option
              v-for="drone in filteredDrones"
              :key="drone.id"
              :value="drone"
            >
              {{ drone.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Drone Cards Grid -->
      <div class="drones-grid">
        <div
          v-for="drone in filteredDrones"
          :key="drone.id"
          class="drone-card"
          @click="selectAndNavigate(drone)"
        >
          <div class="card-header">
            <i class="fas fa-helicopter"></i>
          </div>
          <div class="card-body">
            <h3 class="drone-name">{{ drone.name }}</h3>
            <p class="drone-id">{{ drone.id }}</p>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary">
              <i class="fas fa-arrow-right"></i> View Details
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Retry Button -->
    <div v-if="error && !loading" class="retry-section">
      <button class="btn btn-secondary" @click="loadDrones">
        <i class="fas fa-redo"></i> Retry Loading Drones
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchDroneInventory } from '../services/drone-inventory';

export default {
  name: 'DroneInventory',
  setup() {
    const router = useRouter();
    const drones = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const searchQuery = ref('');
    const selectedDrone = ref('');

    // Filtered drones based on search query
    const filteredDrones = computed(() => {
      if (!searchQuery.value) {
        return drones.value;
      }

      const query = searchQuery.value.toLowerCase();
      return drones.value.filter(drone =>
        drone.name.toLowerCase().includes(query) ||
        drone.id.toLowerCase().includes(query)
      );
    });

    const loadDrones = async () => {
      loading.value = true;
      error.value = null;
      drones.value = [];

      try {
        console.log('🚀 DroneInventory loading drones...');
        const fetchedDrones = await fetchDroneInventory();
        console.log(`✅ Successfully loaded ${fetchedDrones.length} drones`);
        drones.value = fetchedDrones;
      } catch (err) {
        error.value = err.message || 'Failed to load drones';
        console.error('❌ Failed to load drones:', err);
      } finally {
        loading.value = false;
      }
    };

    const selectAndNavigate = (drone) => {
      if (!drone) return;

      console.log(`🔗 Navigating to drone detail for: ${drone.name} (${drone.id})`);
      router.push({
        name: 'DroneDetail',
        params: { id: drone.id },
        query: { name: drone.name }
      });
    };

    onMounted(() => {
      console.log('🚀 DroneInventory mounted, loading drones...');
      loadDrones();
    });

    return {
      drones,
      filteredDrones,
      loading,
      error,
      searchQuery,
      selectedDrone,
      loadDrones,
      selectAndNavigate
    };
  }
};
</script>

<style scoped>
.drone-inventory-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 1rem;
}

/* Header */
.inventory-header {
  max-width: 1400px;
  margin: 0 auto 2rem;
  color: white;
  text-align: center;
}

.page-title {
  font-size: 3rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0.5rem 0 0;
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

/* Alert Styles */
.alert {
  max-width: 1400px;
  margin: 0 auto 2rem;
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

/* Content Area */
.content-area {
  max-width: 1400px;
  margin: 0 auto;
}

/* Search Section */
.search-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
  position: relative;
}

.search-box i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  pointer-events: none;
}

.search-box .form-control {
  padding-left: 2.5rem;
  border-radius: 8px;
  border: 2px solid white;
  height: 45px;
}

.search-box .form-control:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
}

.quick-select {
  min-width: 200px;
}

.quick-select .form-select {
  border-radius: 8px;
  border: 2px solid white;
  height: 45px;
  padding: 0.5rem 1rem;
  background-color: white;
  color: #333;
  font-weight: 500;
}

.quick-select .form-select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
}

/* Drones Grid */
.drones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Drone Card */
.drone-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.drone-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
  font-size: 3rem;
}

.card-body {
  padding: 1.5rem;
  flex: 1;
}

.drone-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem;
  word-break: break-word;
}

.drone-id {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  color: #999;
  margin: 0;
  word-break: break-all;
}

.card-footer {
  padding: 1rem 1.5rem;
  background: #f9f9f9;
  border-top: 1px solid #eee;
}

.card-footer .btn {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.card-footer .btn:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  color: white;
  text-decoration: none;
}

/* Retry Section */
.retry-section {
  text-align: center;
  margin-top: 2rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.btn-secondary {
  background-color: #6c757d;
  border: none;
  padding: 0.75rem 2rem;
  font-weight: 600;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background-color: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.4);
}

/* Responsive Design */
@media (max-width: 768px) {
  .drone-inventory-container {
    padding: 1rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .search-section {
    flex-direction: column;
  }

  .search-box,
  .quick-select {
    min-width: 100%;
  }

  .drones-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.5rem;
  }

  .drones-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .card-header {
    padding: 1.5rem;
    font-size: 2rem;
  }

  .drone-name {
    font-size: 1.1rem;
  }
}
</style>
