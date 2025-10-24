<template>
  <div ref="chartContainer" class="activity-chart"></div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import Plotly from 'plotly.js/dist/plotly.min.js'

export default {
  name: 'ActivityChart',
  props: {
    data: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    const chartContainer = ref(null)

    const createChart = () => {
      if (!props.data || props.data.length === 0) return

      const dates = props.data.map(d => d.date)
      const flights = props.data.map(d => d.flights)
      const durations = props.data.map(d => d.duration / 3600) // Convert to hours

      const trace1 = {
        x: dates,
        y: flights,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Number of Flights',
        line: { color: '#007bff', width: 2 },
        marker: { size: 4 },
        yaxis: 'y1'
      }

      const trace2 = {
        x: dates,
        y: durations,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Flight Hours',
        line: { color: '#28a745', width: 2 },
        marker: { size: 4 },
        yaxis: 'y2'
      }

      const layout = {
        height: 250,
        margin: { l: 40, r: 40, t: 20, b: 40 },
        showlegend: true,
        legend: {
          orientation: 'h',
          y: -0.2,
          x: 0.5,
          xanchor: 'center'
        },
        xaxis: {
          showgrid: false,
          zeroline: false
        },
        yaxis: {
          title: 'Flights',
          side: 'left',
          showgrid: true,
          gridcolor: '#f0f0f0',
          zeroline: false
        },
        yaxis2: {
          title: 'Hours',
          side: 'right',
          overlaying: 'y',
          showgrid: false,
          zeroline: false
        },
        plot_bgcolor: 'transparent',
        paper_bgcolor: 'transparent'
      }

      const config = {
        displayModeBar: false,
        responsive: true
      }

      Plotly.newPlot(chartContainer.value, [trace1, trace2], layout, config)
    }

    onMounted(() => {
      createChart()
    })

    watch(() => props.data, () => {
      createChart()
    }, { deep: true })

    return {
      chartContainer
    }
  }
}
</script>

<style scoped>
.activity-chart {
  width: 100%;
  height: 250px;
}
</style>