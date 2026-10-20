import { ref } from 'vue'

/** Which transient editor surface is open on compact layouts. Only one at a time. */
export type EditorOverlay = 'none' | 'menu' | 'thumbnails' | 'inspector'

const overlayState = ref<EditorOverlay>('none')

/** Shared by the editor shell and the toolbar/dock buttons that control it. */
export default () => {
  const openOverlay = (type: Exclude<EditorOverlay, 'none'>) => { overlayState.value = type }
  const closeOverlay = () => { overlayState.value = 'none' }
  const toggleOverlay = (type: Exclude<EditorOverlay, 'none'>) => {
    overlayState.value = overlayState.value === type ? 'none' : type
  }
  return { overlayState, openOverlay, closeOverlay, toggleOverlay }
}
