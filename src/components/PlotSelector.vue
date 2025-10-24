<template>
  <div class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Add Parameter Plot</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <input 
              type="text" 
              class="form-control" 
              placeholder="Search parameters..."
              v-model="searchQuery"
            >
          </div>
          <div class="parameter-list" style="max-height: 300px; overflow-y: auto;">
            <div 
              v-for="param in filteredParameters" 
              :key="param"
              class="parameter-item d-flex justify-content-between align-items-center p-2 border-bottom"
              style="cursor: pointer;"
              @click="selectParameter(param)"
            >
              <span>{{ formatParameterName(param) }}</span>
              <i class="fas fa-plus text-primary"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'PlotSelector',
  props: {
    availableParameters: {
      type: Array,
      default: () => []
    }
  },
  emits: ['plot-selected', 'close'],
  setup(props, { emit }) {
    const searchQuery = ref('')

    const filteredParameters = computed(() => {
      if (!searchQuery.value) return props.availableParameters
      
      return props.availableParameters.filter(param =>
        param.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    })

    const formatParameterName = (param) => {
      return param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const selectParameter = (param) => {
      emit('plot-selected', param)
    }

    return {
      searchQuery,
      filteredParameters,
      formatParameterName,
      selectParameter
    }
  }
}
</script>

<style scoped>
.parameter-item:hover {
  background-color: #f8f9fa;
}
</style>