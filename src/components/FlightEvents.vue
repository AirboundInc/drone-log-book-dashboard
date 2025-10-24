<template>
  <div class="flight-events">
    <div v-if="events.length === 0" class="text-center py-3">
      <i class="fas fa-calendar-times text-muted"></i>
      <small class="d-block text-muted mt-1">No events recorded</small>
    </div>
    
    <div v-else class="event-list">
      <div 
        v-for="event in events" 
        :key="event.timestamp"
        class="event-item"
        :class="{ 'active': isCurrentEvent(event) }"
        @click="selectEvent(event)"
      >
        <div class="event-time">
          {{ formatTime(event.timestamp) }}
        </div>
        <div class="event-content">
          <div class="event-type">
            <i :class="getEventIcon(event.type)" class="me-1"></i>
            {{ getEventTypeLabel(event.type) }}
          </div>
          <div class="event-message">{{ event.message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FlightEvents',
  props: {
    events: {
      type: Array,
      default: () => []
    },
    currentTime: {
      type: Number,
      default: 0
    }
  },
  emits: ['event-selected'],
  setup(props, { emit }) {
    const getEventIcon = (type) => {
      const iconMap = {
        takeoff: 'fas fa-plane-departure text-success',
        landing: 'fas fa-plane-arrival text-primary',
        mode_change: 'fas fa-exchange-alt text-info',
        warning: 'fas fa-exclamation-triangle text-warning',
        error: 'fas fa-times-circle text-danger',
        waypoint: 'fas fa-map-marker-alt text-secondary'
      }
      return iconMap[type] || 'fas fa-info-circle text-secondary'
    }

    const getEventTypeLabel = (type) => {
      const labelMap = {
        takeoff: 'Takeoff',
        landing: 'Landing',
        mode_change: 'Mode Change',
        warning: 'Warning',
        error: 'Error',
        waypoint: 'Waypoint'
      }
      return labelMap[type] || 'Event'
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
    }

    const isCurrentEvent = (event) => {
      return Math.abs(event.timestamp - props.currentTime) < 5000 // Within 5 seconds
    }

    const selectEvent = (event) => {
      emit('event-selected', event)
    }

    return {
      getEventIcon,
      getEventTypeLabel,
      formatTime,
      isCurrentEvent,
      selectEvent
    }
  }
}
</script>

<style scoped>
.event-list {
  max-height: 300px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.event-item:hover {
  background-color: #f8f9fa;
}

.event-item.active {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
  padding-left: calc(0.75rem - 3px);
}

.event-item:last-child {
  border-bottom: none;
}

.event-time {
  font-size: 0.75rem;
  color: #6c757d;
  min-width: 60px;
  font-family: monospace;
}

.event-content {
  flex: 1;
  margin-left: 0.75rem;
}

.event-type {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.event-message {
  font-size: 0.875rem;
  color: #6c757d;
}
</style>