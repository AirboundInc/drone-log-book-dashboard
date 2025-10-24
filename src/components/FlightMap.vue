<template>
  <div class="flight-map">
    <div v-if="mode === '3d'" ref="cesiumContainer" class="cesium-container"></div>
    <div v-else ref="mapContainer" class="map-container-2d">
      <div class="text-center py-5">
        <i class="fas fa-map fa-3x text-muted mb-3"></i>
        <h6 class="text-muted">2D Map View</h6>
        <p class="text-muted">2D map implementation would go here</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'

export default {
  name: 'FlightMap',
  props: {
    flight: Object,
    telemetry: Array,
    mode: {
      type: String,
      default: '3d'
    },
    currentTime: {
      type: Number,
      default: 0
    }
  },
  emits: ['time-changed'],
  setup(props, { emit }) {
    const cesiumContainer = ref(null)
    const mapContainer = ref(null)
    const viewer = ref(null)

    const initializeCesium = async () => {
      if (props.mode !== '3d' || !cesiumContainer.value) return

      try {
        // This would require Cesium to be properly loaded
        // For now, we'll show a placeholder
        cesiumContainer.value.innerHTML = `
          <div class="text-center py-5">
            <i class="fas fa-globe fa-3x text-primary mb-3"></i>
            <h6 class="text-primary">3D Flight Path Visualization</h6>
            <p class="text-muted">Cesium 3D map would be rendered here</p>
            <small class="text-muted">Install and configure Cesium for full 3D visualization</small>
          </div>
        `
      } catch (error) {
        console.error('Failed to initialize Cesium:', error)
      }
    }

    onMounted(() => {
      initializeCesium()
    })

    watch(() => props.mode, () => {
      if (props.mode === '3d') {
        initializeCesium()
      }
    })

    return {
      cesiumContainer,
      mapContainer
    }
  }
}
</script>

<style scoped>
.flight-map {
  height: 500px;
}

.cesium-container,
.map-container-2d {
  width: 100%;
  height: 100%;
  background-color: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>