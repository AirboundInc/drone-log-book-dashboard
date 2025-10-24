<template>
  <div class="flight-stats">
    <div class="row g-3">
      <!-- Basic Stats -->
      <div class="col-6">
        <div class="stat-item">
          <div class="stat-label">Max Altitude</div>
          <div class="stat-value">{{ maxAltitude }}m</div>
        </div>
      </div>
      <div class="col-6">
        <div class="stat-item">
          <div class="stat-label">Max Speed</div>
          <div class="stat-value">{{ maxSpeed }}m/s</div>
        </div>
      </div>
      <div class="col-6">
        <div class="stat-item">
          <div class="stat-label">Avg Speed</div>
          <div class="stat-value">{{ avgSpeed }}m/s</div>
        </div>
      </div>
      <div class="col-6">
        <div class="stat-item">
          <div class="stat-label">Total Distance</div>
          <div class="stat-value">{{ totalDistance }}m</div>
        </div>
      </div>
      <div class="col-12">
        <div class="stat-item">
          <div class="stat-label">Battery Consumption</div>
          <div class="progress" style="height: 20px;">
            <div 
              class="progress-bar"
              :class="getBatteryClass(batteryUsed)"
              :style="{ width: batteryUsed + '%' }"
            >
              {{ batteryUsed }}%
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'FlightStats',
  props: {
    flight: Object,
    telemetry: Array
  },
  setup(props) {
    const maxAltitude = computed(() => {
      if (!props.telemetry || props.telemetry.length === 0) return 0
      return Math.max(...props.telemetry.map(p => p.altitude || 0)).toFixed(1)
    })

    const maxSpeed = computed(() => {
      if (!props.telemetry || props.telemetry.length === 0) return 0
      return Math.max(...props.telemetry.map(p => p.ground_speed || 0)).toFixed(1)
    })

    const avgSpeed = computed(() => {
      if (!props.telemetry || props.telemetry.length === 0) return 0
      const speeds = props.telemetry.map(p => p.ground_speed || 0)
      const avg = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
      return avg.toFixed(1)
    })

    const totalDistance = computed(() => {
      return props.flight?.distance?.toFixed(0) || 0
    })

    const batteryUsed = computed(() => {
      if (!props.telemetry || props.telemetry.length === 0) return 0
      const start = props.telemetry[0]?.battery_voltage || 14.8
      const end = props.telemetry[props.telemetry.length - 1]?.battery_voltage || 14.8
      const used = ((start - end) / start) * 100
      return Math.max(0, Math.min(100, used)).toFixed(0)
    })

    const getBatteryClass = (used) => {
      if (used < 30) return 'bg-success'
      if (used < 70) return 'bg-warning'
      return 'bg-danger'
    }

    return {
      maxAltitude,
      maxSpeed,
      avgSpeed,
      totalDistance,
      batteryUsed,
      getBatteryClass
    }
  }
}
</script>

<style scoped>
.stat-item {
  text-align: center;
  padding: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #495057;
}
</style>