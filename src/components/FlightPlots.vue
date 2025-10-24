<template>
  <div class="flight-plots">
    <div v-if="!telemetry || telemetry.length === 0" class="text-center py-4">
      <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
      <h6 class="text-muted">No telemetry data available</h6>
    </div>
    
    <div v-else>
      <!-- Plot Container -->
      <div ref="plotContainer" class="plot-container"></div>
      
      <!-- Plot Controls -->
      <div class="plot-controls mt-3">
        <div class="row align-items-center">
          <div class="col-md-6">
            <div class="d-flex gap-2 flex-wrap">
              <span 
                v-for="plot in selectedPlots" 
                :key="plot"
                class="badge bg-primary position-relative"
                style="padding-right: 2rem;"
              >
                {{ getParameterLabel(plot) }}
                <button 
                  class="btn-close btn-close-white position-absolute top-50 end-0 translate-middle"
                  style="font-size: 0.6rem; margin-right: 0.25rem;"
                  @click="removePlot(plot)"
                ></button>
              </span>
            </div>
          </div>
          <div class="col-md-6 text-md-end">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary" @click="zoomIn">
                <i class="fas fa-search-plus"></i>
              </button>
              <button class="btn btn-outline-secondary" @click="zoomOut">
                <i class="fas fa-search-minus"></i>
              </button>
              <button class="btn btn-outline-secondary" @click="resetZoom">
                <i class="fas fa-home"></i>
              </button>
              <button class="btn btn-outline-secondary" @click="toggleSync">
                <i class="fas fa-link" :class="{ 'text-primary': syncEnabled }"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Time Cursor Info -->
      <div v-if="cursorInfo" class="cursor-info mt-2 p-2 bg-light rounded">
        <small>
          <strong>Time:</strong> {{ formatTime(cursorInfo.time) }} |
          <span v-for="(value, param) in cursorInfo.values" :key="param" class="me-3">
            <strong>{{ getParameterLabel(param) }}:</strong> {{ formatValue(value, param) }}
          </span>
        </small>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, nextTick } from 'vue'
import Plotly from 'plotly.js/dist/plotly.min.js'

export default {
  name: 'FlightPlots',
  props: {
    telemetry: {
      type: Array,
      required: true
    },
    parameters: {
      type: Object,
      default: () => ({})
    },
    currentTime: {
      type: Number,
      default: 0
    },
    selectedPlots: {
      type: Array,
      default: () => ['altitude', 'ground_speed']
    }
  },
  emits: ['time-changed', 'plot-added', 'plot-removed'],
  setup(props, { emit }) {
    const plotContainer = ref(null)
    const cursorInfo = ref(null)
    const syncEnabled = ref(true)
    const plotInstance = ref(null)

    // Parameter configuration
    const parameterConfig = {
      altitude: { label: 'Altitude', unit: 'm', color: '#007bff', yaxis: 'y1' },
      ground_speed: { label: 'Ground Speed', unit: 'm/s', color: '#28a745', yaxis: 'y2' },
      battery_voltage: { label: 'Battery Voltage', unit: 'V', color: '#dc3545', yaxis: 'y3' },
      gps_satellites: { label: 'GPS Satellites', unit: '', color: '#ffc107', yaxis: 'y4' },
      roll: { label: 'Roll', unit: '°', color: '#6f42c1', yaxis: 'y5' },
      pitch: { label: 'Pitch', unit: '°', color: '#fd7e14', yaxis: 'y6' },
      yaw: { label: 'Yaw', unit: '°', color: '#20c997', yaxis: 'y7' },
      vertical_speed: { label: 'Vertical Speed', unit: 'm/s', color: '#e83e8c', yaxis: 'y8' }
    }

    const createPlot = async () => {
      if (!props.telemetry || props.telemetry.length === 0 || !plotContainer.value) return

      await nextTick()

      const traces = []
      const yAxisConfig = {}
      
      // Prepare time data
      const timeData = props.telemetry.map(point => new Date(point.timestamp))
      
      // Create traces for selected parameters
      props.selectedPlots.forEach((param, index) => {
        const config = parameterConfig[param] || { 
          label: param, 
          unit: '', 
          color: `hsl(${index * 45}, 70%, 50%)`,
          yaxis: `y${index + 1}`
        }
        
        const yData = props.telemetry.map(point => point[param] || 0)
        
        traces.push({
          x: timeData,
          y: yData,
          type: 'scatter',
          mode: 'lines',
          name: config.label,
          line: { 
            color: config.color, 
            width: 2 
          },
          yaxis: config.yaxis.replace('y', '') || 'y',
          hovertemplate: `<b>${config.label}</b><br>` +
                        `Time: %{x}<br>` +
                        `Value: %{y}${config.unit}<br>` +
                        '<extra></extra>'
        })

        // Configure Y-axis
        const yAxisKey = config.yaxis === 'y1' ? 'yaxis' : config.yaxis
        yAxisConfig[yAxisKey] = {
          title: `${config.label} (${config.unit})`,
          side: index % 2 === 0 ? 'left' : 'right',
          overlaying: index > 0 ? 'y' : undefined,
          showgrid: index === 0,
          gridcolor: '#f0f0f0',
          zeroline: false,
          tickcolor: config.color,
          titlefont: { color: config.color }
        }
      })

      const layout = {
        height: 400,
        margin: { l: 60, r: 60, t: 20, b: 60 },
        showlegend: true,
        legend: {
          orientation: 'h',
          y: -0.2,
          x: 0.5,
          xanchor: 'center'
        },
        xaxis: {
          title: 'Time',
          showgrid: true,
          gridcolor: '#f0f0f0',
          zeroline: false
        },
        ...yAxisConfig,
        plot_bgcolor: 'white',
        paper_bgcolor: 'transparent',
        hovermode: 'x unified'
      }

      const config = {
        displayModeBar: true,
        modeBarButtonsToRemove: [
          'pan2d', 'select2d', 'lasso2d', 'autoScale2d', 'hoverClosestCartesian',
          'hoverCompareCartesian', 'toggleSpikelines'
        ],
        displaylogo: false,
        responsive: true
      }

      // Create or update plot
      if (plotInstance.value) {
        await Plotly.react(plotContainer.value, traces, layout, config)
      } else {
        await Plotly.newPlot(plotContainer.value, traces, layout, config)
        plotInstance.value = plotContainer.value
        
        // Add event listeners
        plotContainer.value.on('plotly_hover', onHover)
        plotContainer.value.on('plotly_unhover', onUnhover)
        plotContainer.value.on('plotly_click', onClick)
      }

      // Add current time indicator
      updateTimeIndicator()
    }

    const updateTimeIndicator = () => {
      if (!plotInstance.value || !props.currentTime) return

      const shapes = [{
        type: 'line',
        x0: new Date(props.currentTime),
        x1: new Date(props.currentTime),
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: '#ff0000',
          width: 2,
          dash: 'dash'
        }
      }]

      Plotly.relayout(plotContainer.value, { shapes })
    }

    const onHover = (data) => {
      if (!data.points || data.points.length === 0) return

      const point = data.points[0]
      const timeIndex = point.pointIndex
      
      if (timeIndex >= 0 && timeIndex < props.telemetry.length) {
        const telemetryPoint = props.telemetry[timeIndex]
        const values = {}
        
        props.selectedPlots.forEach(param => {
          values[param] = telemetryPoint[param]
        })
        
        cursorInfo.value = {
          time: telemetryPoint.timestamp,
          values
        }
      }
    }

    const onUnhover = () => {
      cursorInfo.value = null
    }

    const onClick = (data) => {
      if (!data.points || data.points.length === 0) return
      
      const point = data.points[0]
      const timeIndex = point.pointIndex
      
      if (timeIndex >= 0 && timeIndex < props.telemetry.length) {
        const timestamp = props.telemetry[timeIndex].timestamp
        emit('time-changed', timestamp)
      }
    }

    const getParameterLabel = (param) => {
      return parameterConfig[param]?.label || param
    }

    const formatValue = (value, param) => {
      if (typeof value !== 'number') return 'N/A'
      
      const unit = parameterConfig[param]?.unit || ''
      const formatted = value.toFixed(2)
      return `${formatted}${unit}`
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })
    }

    const removePlot = (param) => {
      emit('plot-removed', param)
    }

    const zoomIn = () => {
      if (!plotInstance.value) return
      
      const update = {
        'xaxis.range[0]': new Date(props.currentTime - 300000), // -5 minutes
        'xaxis.range[1]': new Date(props.currentTime + 300000)  // +5 minutes
      }
      
      Plotly.relayout(plotContainer.value, update)
    }

    const zoomOut = () => {
      if (!plotInstance.value) return
      Plotly.relayout(plotContainer.value, { 'xaxis.autorange': true })
    }

    const resetZoom = () => {
      if (!plotInstance.value) return
      Plotly.relayout(plotContainer.value, { 
        'xaxis.autorange': true,
        'yaxis.autorange': true
      })
    }

    const toggleSync = () => {
      syncEnabled.value = !syncEnabled.value
    }

    // Watchers
    watch(() => props.telemetry, createPlot, { deep: true })
    watch(() => props.selectedPlots, createPlot, { deep: true })
    watch(() => props.currentTime, updateTimeIndicator)

    // Lifecycle
    onMounted(() => {
      createPlot()
    })

    return {
      plotContainer,
      cursorInfo,
      syncEnabled,
      getParameterLabel,
      formatValue,
      formatTime,
      removePlot,
      zoomIn,
      zoomOut,
      resetZoom,
      toggleSync
    }
  }
}
</script>

<style scoped>
.plot-container {
  width: 100%;
  height: 400px;
}

.plot-controls .badge {
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
}

.cursor-info {
  font-family: monospace;
  border: 1px solid #dee2e6;
}

.btn-close-white {
  filter: brightness(0) invert(1);
}
</style>