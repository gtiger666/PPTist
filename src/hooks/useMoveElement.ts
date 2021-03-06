import { computed } from 'vue'
import { MutationTypes, useStore } from '@/store'
import { Slide } from '@/types/slides'
import { KEYS } from '@/configs/hotkey'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

export default () => {
  const store = useStore()
  const activeElementIdList = computed(() => store.state.activeElementIdList)
  const currentSlide = computed<Slide>(() => store.getters.currentSlide)

  const { addHistorySnapshot } = useHistorySnapshot()

  const moveElement = (command: string) => {
    const newElementList = currentSlide.value.elements.map(el => {
      if (activeElementIdList.value.includes(el.id)) {
        let { left, top } = el
        switch (command) {
          case KEYS.LEFT: 
            left = left - 1
            break
          case KEYS.RIGHT: 
            left = left + 1
            break
          case KEYS.UP: 
            top = top - 1
            break
          case KEYS.DOWN: 
            top = top + 1
            break
          default: break
        }
        return { ...el, left, top }
      }
      return el
    })
    store.commit(MutationTypes.UPDATE_SLIDE, { elements: newElementList })
    addHistorySnapshot()
  }

  return {
    moveElement,
  }
}