import { computed, type Ref } from 'vue'
import type { ImageElementFilters } from '@/types/slides'
import { formatCSSFilter } from '@/utils/imageAdjustments'

export default (filters: Ref<ImageElementFilters | undefined>) => {
  const filter = computed(() => {
    return formatCSSFilter(filters.value)
  })

  return {
    filter,
  }
}