import { ref, computed, onMounted, onUnmounted, watch, type ShallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'

export default (canvasRef: ShallowRef<HTMLElement | null>) => {
  const viewportLeft = ref(0)
  const viewportTop = ref(0)

  const mainStore = useMainStore()
  const { canvasPercentage, canvasDragged } = storeToRefs(mainStore)
  const { viewportRatio, viewportSize } = storeToRefs(useSlidesStore())

  // Floating chrome sits above an edge-to-edge canvas; --fit-* insets mark the free area the slide fits into.
  const getFitArea = () => {
    const el = canvasRef.value!
    // Custom properties hold unresolved calc()/env(); a probe lets the browser resolve them.
    const probe = document.createElement('div')
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;inset:var(--fit-top,0px) var(--fit-right,0px) var(--fit-bottom,0px) var(--fit-left,0px)'
    el.appendChild(probe)
    const outer = el.getBoundingClientRect()
    const inner = probe.getBoundingClientRect()
    el.removeChild(probe)
    return {
      left: inner.left - outer.left,
      top: inner.top - outer.top,
      width: Math.max(1, inner.width),
      height: Math.max(1, inner.height),
    }
  }

  // 初始化画布可视区域的位置
  const initViewportPosition = () => {
    if (!canvasRef.value) return
    const fit = getFitArea()
    const canvasWidth = fit.width
    const canvasHeight = fit.height

    if (canvasHeight / canvasWidth > viewportRatio.value) {
      const viewportActualWidth = canvasWidth * (canvasPercentage.value / 100)
      mainStore.setCanvasScale(viewportActualWidth / viewportSize.value)
      viewportLeft.value = fit.left + (canvasWidth - viewportActualWidth) / 2
      viewportTop.value = fit.top + (canvasHeight - viewportActualWidth * viewportRatio.value) / 2
    }
    else {
      const viewportActualHeight = canvasHeight * (canvasPercentage.value / 100)
      mainStore.setCanvasScale(viewportActualHeight / (viewportSize.value * viewportRatio.value))
      viewportLeft.value = fit.left + (canvasWidth - viewportActualHeight / viewportRatio.value) / 2
      viewportTop.value = fit.top + (canvasHeight - viewportActualHeight) / 2
    }
  }

  // 更新画布可视区域的位置
  const setViewportPosition = (newValue: number, oldValue: number) => {
    if (!canvasRef.value) return
    const { width: canvasWidth, height: canvasHeight } = getFitArea()

    if (canvasHeight / canvasWidth > viewportRatio.value) {      
      const newViewportActualWidth = canvasWidth * (newValue / 100)
      const oldViewportActualWidth = canvasWidth * (oldValue / 100)
      const newViewportActualHeight = newViewportActualWidth * viewportRatio.value
      const oldViewportActualHeight = oldViewportActualWidth * viewportRatio.value

      mainStore.setCanvasScale(newViewportActualWidth / viewportSize.value)

      viewportLeft.value = viewportLeft.value - (newViewportActualWidth - oldViewportActualWidth) / 2
      viewportTop.value = viewportTop.value - (newViewportActualHeight - oldViewportActualHeight) / 2
    }
    else {
      const newViewportActualHeight = canvasHeight * (newValue / 100)
      const oldViewportActualHeight = canvasHeight * (oldValue / 100)
      const newViewportActualWidth = newViewportActualHeight / viewportRatio.value
      const oldViewportActualWidth = oldViewportActualHeight / viewportRatio.value

      mainStore.setCanvasScale(newViewportActualHeight / (viewportSize.value * viewportRatio.value))

      viewportLeft.value = viewportLeft.value - (newViewportActualWidth - oldViewportActualWidth) / 2
      viewportTop.value = viewportTop.value - (newViewportActualHeight - oldViewportActualHeight) / 2
    }
  }

  // 可视区域缩放或比例变化时，重置/更新可视区域的位置
  watch(canvasPercentage, setViewportPosition)
  watch(viewportRatio, initViewportPosition)
  watch(viewportSize, initViewportPosition)

  // 画布拖拽状态改变（复原）时，重置可视区域的位置
  watch(canvasDragged, () => {
    if (!canvasDragged.value) initViewportPosition()
  })

  // 画布可视区域位置和大小的样式
  const viewportStyles = computed(() => ({
    width: viewportSize.value,
    height: viewportSize.value * viewportRatio.value,
    left: viewportLeft.value,
    top: viewportTop.value,
  }))

  // 监听画布尺寸发生变化时，重置可视区域的位置
  const resizeObserver = new ResizeObserver(initViewportPosition)

  onMounted(() => {
    if (canvasRef.value) resizeObserver.observe(canvasRef.value)
  })
  onUnmounted(() => {
    if (canvasRef.value) resizeObserver.unobserve(canvasRef.value)
  })

  // 拖拽画布
  const dragViewport = (e: MouseEvent) => {
    let isMouseDown = true

    const startPageX = e.pageX
    const startPageY = e.pageY

    const originLeft = viewportLeft.value
    const originTop = viewportTop.value

    document.onmousemove = e => {
      if (!isMouseDown) return

      const currentPageX = e.pageX
      const currentPageY = e.pageY

      viewportLeft.value = originLeft + (currentPageX - startPageX)
      viewportTop.value = originTop + (currentPageY - startPageY)
    }

    document.onmouseup = () => {
      isMouseDown = false
      document.onmousemove = null
      document.onmouseup = null

      mainStore.setCanvasDragged(true)
    }
  }

  return {
    viewportStyles,
    dragViewport,
  }
}