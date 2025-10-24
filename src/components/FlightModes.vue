<template>
  <div class="flight-modes">
    <div v-if="modes.length === 0" class="text-center py-3">
      <i class="fas fa-cog text-muted"></i>
      <small class="d-block text-muted mt-1">No mode data available</small>
    </div>
    
    <div v-else class="mode-timeline">
      <div 
        v-for="mode in modes" 
        :key="mode.start_time"
        class="mode-segment"
        :class="{ 'active': isCurrentMode(mode) }"
        @click="selectMode(mode)"
      >
        <div class="mode-header">
          <span class="mode-name">{{ mode.mode }}</span>
          <span class="mode-duration">{{ formatDuration(mode.end_time - mode.start_time) }}</span>
        </div>
        <div class="mode-bar">
          <div 
            class="mode-fill"
            :class="getModeClass(mode.mode)"
            :style="{ width: '100%' }"
          ></div>
        </div>
        <div class="mode-times">
          <small class="text-muted">
            {{ formatTime(mode.start_time) }} - {{ formatTime(mode.end_time) }}
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FlightModes',
  props: {
    modes: {
      type: Array,
      default: () => []
    },
    currentTime: {
      type: Number,
      default: 0
    }
  },
  emits: ['mode-selected'],
  setup(props, { emit }) {
    const getModeClass = (mode) => {
      const modeMap = {
        MANUAL: 'bg-primary',
        STABILIZE: 'bg-success',
        AUTO: 'bg-info',
        GUIDED: 'bg-warning',
        LAND: 'bg-secondary',
        RTL: 'bg-danger',
        LOITER: 'bg-dark'
      }
      return modeMap[mode] || 'bg-secondary'
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit'
      })
    }

    const formatDuration = (milliseconds) => {
      const seconds = Math.floor(milliseconds / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      
      if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`
      }
      return `${remainingSeconds}s`
    }

    const isCurrentMode = (mode) => {
      return props.currentTime >= mode.start_time && props.currentTime <= mode.end_time
    }

    const selectMode = (mode) => {
      emit('mode-selected', mode)
    }

    return {
      getModeClass,
      formatTime,
      formatDuration,
      isCurrentMode,
      selectMode
    }
  }
}
</script>

<style scoped>
.mode-timeline {
  max-height: 300px;
  overflow-y: auto;
}

.mode-segment {
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.mode-segment:hover {
  background-color: #f8f9fa;
}

.mode-segment.active {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
  padding-left: calc(0.75rem - 3px);
}

.mode-segment:last-child {
  border-bottom: none;
}

.mode-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.mode-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.mode-duration {
  font-size: 0.75rem;
  color: #6c757d;
  margin-left: auto;
}

.mode-bar {
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.mode-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.mode-times {
  font-size: 0.75rem;
}
</style>