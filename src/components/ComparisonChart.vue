<template>
  <div class="comparison-chart">
    <div v-if="!telemetryData || telemetryData.length === 0" class="text-center py-4">
      <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
      <h6 class="text-muted">No comparison data available</h6>
    </div>
    
    <div v-else ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script>
import { ref, onMounted, watch, nextTick } from 'vue'
import Plotly from 'plotly.js/dist/plotly.min.js'

export default {
  name: 'ComparisonChart',
  props: {
    flights: {
      type: Array,
      required: true
    },
    telemetryData: {
      type: Array,
      required: true
    },
    parameters: {
      type: Array,
      default: () => ['altitude']
    },
    compareBy: {
      type: String,
      default: 'time'
    }
  },
  setup(props) {
    const chartContainer = ref(null)

    const colors = [
      '#007bff', '#28a745', '#dc3545', '#ffc107',
      '#6f42c1', '#fd7e14', '#20c997', '#e83e8c'
    ]

    const createChart = async () => {
      if (!props.telemetryData || props.telemetryData.length === 0 || !chartContainer.value) return

      await nextTick()

      const traces = []
      
      props.parameters.forEach((parameter, paramIndex) => {
        props.flights.forEach((flight, flightIndex) => {
          const telemetry = props.telemetryData[flightIndex] || []
          
          if (telemetry.length === 0) return

          let xData, yData
          
          if (props.compareBy === 'relative') {
            // Normalize to 0-100% progress
            xData = telemetry.map((_, index) => (index / (telemetry.length - 1)) * 100)
          } else {
            // Use actual timestamps
            xData = telemetry.map(point => new Date(point.timestamp))
          }
          
          yData = telemetry.map(point => point[parameter] || 0)
          
          const color = colors[(flightIndex + paramIndex * props.flights.length) % colors.length]
          
          traces.push({
            x: xData,
            y: yData,
            type: 'scatter',
            mode: 'lines',
            name: `${flight.name || `Flight ${flight.id}`} - ${formatParameterName(parameter)}`,
            line: { 
              color: color, 
              width: 2,
              dash: paramIndex > 0 ? 'dot' : 'solid'
            },
            yaxis: paramIndex === 0 ? 'y' : `y${paramIndex + 1}`,
            hovertemplate: `<b>${flight.name || `Flight ${flight.id}`}</b><br>` +
                          `${formatParameterName(parameter)}: %{y}<br>` +
                          (props.compareBy === 'relative' ? 'Progress: %{x}%' : 'Time: %{x}') +
                          '<extra></extra>'
          })
        })
      })

      const layout = {
        height: 500,
        margin: { l: 60, r: 60, t: 40, b: 60 },
        title: {
          text: `Flight Comparison - ${props.parameters.map(formatParameterName).join(', ')}`,
          font: { size: 16 }
        },
        showlegend: true,
        legend: {
          orientation: 'h',
          y: -0.2,
          x: 0.5,
          xanchor: 'center'
        },
        xaxis: {
          title: props.compareBy === 'relative' ? 'Flight Progress (%)' : 'Time',
          showgrid: true,
          gridcolor: '#f0f0f0'
        },
        yaxis: {
          title: formatParameterName(props.parameters[0]),
          showgrid: true,
          gridcolor: '#f0f0f0',
          side: 'left'
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'transparent'
      }

      // Add additional Y-axes for multiple parameters
      if (props.parameters.length > 1) {
        props.parameters.slice(1).forEach((param, index) => {
          const yAxisKey = `yaxis${index + 2}`
          layout[yAxisKey] = {
            title: formatParameterName(param),
            side: index % 2 === 0 ? 'right' : 'left',
            overlaying: 'y',
            showgrid: false,
            position: index % 2 === 0 ? 1 : 0
          }
        })
      }

      const config = {
        displayModeBar: true,
        modeBarButtonsToRemove: [
          'pan2d', 'select2d', 'lasso2d', 'autoScale2d'
        ],
        displaylogo: false,
        responsive: true
      }

      await Plotly.newPlot(chartContainer.value, traces, layout, config)
    }

    const formatParameterName = (param) => {
      return param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    // Watchers
    watch(() => [props.telemetryData, props.parameters, props.compareBy], createChart, { deep: true })

    // Lifecycle
    onMounted(() => {
      createChart()
    })

    return {
      chartContainer
    }
  }
}
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 500px;
}
</style>