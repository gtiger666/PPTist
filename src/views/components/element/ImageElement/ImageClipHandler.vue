<template>
  <div 
    class="image-clip-handler" 
    :style="clipWrapperPositionStyle" 
    v-click-outside="handleClip"
  >
    <img 
      class="bottom-img" 
      :src="src" 
      :draggable="false" 
      alt="" 
      :style="bottomImgPositionStyle" 
    />

    <div 
      class="top-image-content" 
      :style="{
        ...topImgWrapperPositionStyle,
        clipPath,
      }"
    >
      <img 
        class="top-img" 
        :src="src" 
        :draggable="false" 
        alt="" 
        :style="topImgPositionStyle" 
      />
    </div>

    <div 
      class="operate" 
      :style="topImgWrapperPositionStyle" 
      @mousedown.stop="$event => moveClipRange($event)"
    >
      <div 
        :class="['clip-point', point]" 
        v-for="point in ['t-l', 't-r', 'b-l', 'b-r']" 
        :key="point" 
        @mousedown.stop="$event => scaleClipRange($event, point)"
      >
        <SvgWrapper width="12" height="12" fill="#fff" stroke="#333">
          <path
            stroke-width="0.3" 
            shape-rendering="crispEdges"
            d="M 16 0 L 0 0 L 0 16 L 4 16 L 4 4 L 16 4 L 16 0 Z"
          ></path>
        </SvgWrapper>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, PropType, reactive, ref } from 'vue'
import { useStore } from '@/store'
import { KEYS } from '@/configs/hotkey'
import { ImageClipData, ImageClipDataRange, ImageClipedEmitData } from '@/types/edit'

type ScaleClipRangeType = 't-l' | 't-r' | 'b-l' | 'b-r'

export default defineComponent({
  name: 'image-clip-handler',
  props: {
    src: {
      type: String,
      required: true,
    },
    clipData: {
      type: Object as PropType<ImageClipData>,
    },
    clipPath: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    top: {
      type: Number,
      required: true,
    },
    left: {
      type: Number,
      required: true,
    },
  },
  setup(props, { emit }) {
    const store = useStore()
    const canvasScale = computed(() => store.state.canvasScale)

    const topImgWrapperPosition = reactive({
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    })
    const clipWrapperPositionStyle = reactive({
      top: '0',
      left: '0',
    })
    const isSettingClipRange = ref(false)
    const currentRange = ref<ImageClipDataRange | null>(null)

    const getClipDataTransformInfo = () => {
      const [start, end] = props.clipData ? props.clipData.range : [[0, 0], [100, 100]]

      const widthScale = (end[0] - start[0]) / 100
      const heightScale = (end[1] - start[1]) / 100
      const left = start[0] / widthScale
      const top = start[1] / heightScale

      return { widthScale, heightScale, left, top }
    }

    const imgPosition = computed(() => {
      const { widthScale, heightScale, left, top } = getClipDataTransformInfo()
      return {
        left: -left,
        top: -top,
        width: 100 / widthScale,
        height: 100 / heightScale,
      }
    })

    const bottomImgPositionStyle = computed(() => {
      return {
        top: imgPosition.value.top + '%',
        left: imgPosition.value.left + '%',
        width: imgPosition.value.width + '%',
        height: imgPosition.value.height + '%',
      }
    })

    const topImgWrapperPositionStyle = computed(() => {
      return {
        top: topImgWrapperPosition.top + '%',
        left: topImgWrapperPosition.left + '%',
        width: topImgWrapperPosition.width + '%',
        height: topImgWrapperPosition.height + '%',
      }
    })

    const topImgPositionStyle = computed(() => {
      const bottomWidth = imgPosition.value.width
      const bottomHeight = imgPosition.value.height
      
      const topLeft = topImgWrapperPosition.left
      const topTop = topImgWrapperPosition.top
      const topWidth = topImgWrapperPosition.width
      const topHeight = topImgWrapperPosition.height
      
      return {
        left: -topLeft * (100 / topWidth) + '%',
        top: -topTop * (100 / topHeight) + '%',
        width: bottomWidth / topWidth * 100 + '%',
        height: bottomHeight / topHeight * 100 + '%',
      }
    })

    const initClipPosition = () => {
      const { left, top } = getClipDataTransformInfo()
      topImgWrapperPosition.left = left
      topImgWrapperPosition.top = top
      topImgWrapperPosition.width = 100
      topImgWrapperPosition.height = 100
      
      clipWrapperPositionStyle.top = -top + '%'
      clipWrapperPositionStyle.left = -left + '%'
    }

    const handleClip = () => {
      if (isSettingClipRange.value) return

      if (!currentRange.value) {
        emit('clip', null)
        return
      }

      const { left, top } = getClipDataTransformInfo()

      const position = {
        left: (topImgWrapperPosition.left - left) / 100 * props.width,
        top: (topImgWrapperPosition.top - top) / 100 * props.height,
        width: (topImgWrapperPosition.width - 100) / 100 * props.width,
        height: (topImgWrapperPosition.height - 100) / 100 * props.height,
      }

      const clipedEmitData: ImageClipedEmitData = {
        range: currentRange.value,
        position,
      }
      emit('clip', clipedEmitData)
    }

    const keyboardClip = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase()
      if (key === KEYS.ENTER) handleClip()
    }

    onMounted(() => {
      initClipPosition()
      document.addEventListener('keydown', keyboardClip)
    })
    onUnmounted(() => {
      document.removeEventListener('keydown', keyboardClip)
    })

    const getRange = () => {
      const retPosition = {
        left: parseInt(topImgPositionStyle.value.left),
        top: parseInt(topImgPositionStyle.value.top),
        width: parseInt(topImgPositionStyle.value.width),
        height: parseInt(topImgPositionStyle.value.height),
      }

      const widthScale = 100 / retPosition.width
      const heightScale = 100 / retPosition.height

      const start: [number, number] = [
        -retPosition.left * widthScale,
        -retPosition.top * heightScale,
      ]
      const end: [number, number] = [
        widthScale * 100 + start[0],
        heightScale * 100 + start[1],
      ]

      currentRange.value = [start, end]
    }

    const moveClipRange = (e: MouseEvent) => {
      isSettingClipRange.value = true
      let isMouseDown = true

      const startPageX = e.pageX
      const startPageY = e.pageY
      const bottomPosition = imgPosition.value
      const originPositopn = {
        left: topImgWrapperPosition.left,
        top: topImgWrapperPosition.top,
        width: topImgWrapperPosition.width,
        height: topImgWrapperPosition.height,
      }

      document.onmousemove = e => {
        if (!isMouseDown) return

        const currentPageX = e.pageX
        const currentPageY = e.pageY

        const moveX = (currentPageX - startPageX) / canvasScale.value / props.width * 100
        const moveY = (currentPageY - startPageY) / canvasScale.value / props.height * 100

        let targetLeft = originPositopn.left + moveX
        let targetTop = originPositopn.top + moveY

        // 范围限制
        if (targetLeft < 0) targetLeft = 0
        else if (targetLeft + originPositopn.width > bottomPosition.width) {
          targetLeft = bottomPosition.width - originPositopn.width
        }
        if (targetTop < 0) targetTop = 0
        else if (targetTop + originPositopn.height > bottomPosition.height) {
          targetTop = bottomPosition.height - originPositopn.height
        }
        
        topImgWrapperPosition.left = targetLeft
        topImgWrapperPosition.top = targetTop
      }

      document.onmouseup = () => {
        isMouseDown = false
        document.onmousemove = null
        document.onmouseup = null

        getRange()

        setTimeout(() => {
          isSettingClipRange.value = false
        }, 0)
      }
    }

    const scaleClipRange = (e: MouseEvent, type: ScaleClipRangeType) => {
      isSettingClipRange.value = true
      let isMouseDown = true

      const minWidth = 50 / props.width * 100
      const minHeight = 50 / props.height * 100
      
      const startPageX = e.pageX
      const startPageY = e.pageY
      const bottomPosition = imgPosition.value
      const originPositopn = {
        left: topImgWrapperPosition.left,
        top: topImgWrapperPosition.top,
        width: topImgWrapperPosition.width,
        height: topImgWrapperPosition.height,
      }

      document.onmousemove = e => {
        if (!isMouseDown) return

        const currentPageX = e.pageX
        const currentPageY = e.pageY

        let moveX = (currentPageX - startPageX) / canvasScale.value / props.width * 100
        let moveY = (currentPageY - startPageY) / canvasScale.value / props.height * 100

        let targetLeft, targetTop, targetWidth, targetHeight

        // 根据不同缩放点，计算目标大小和位置，同时做大小和范围的限制
        if (type === 't-l') {
          if (originPositopn.left + moveX < 0) {
            moveX = -originPositopn.left
          }
          if (originPositopn.top + moveY < 0) {
            moveY = -originPositopn.top
          }
          if (originPositopn.width - moveX < minWidth) {
            moveX = originPositopn.width - minWidth
          }
          if (originPositopn.height - moveY < minHeight) {
            moveY = originPositopn.height - minHeight
          }
          targetWidth = originPositopn.width - moveX
          targetHeight = originPositopn.height - moveY
          targetLeft = originPositopn.left + moveX
          targetTop = originPositopn.top + moveY
        }
        else if (type === 't-r') {
          if (originPositopn.left + originPositopn.width + moveX > bottomPosition.width) {
            moveX = bottomPosition.width - (originPositopn.left + originPositopn.width)
          }
          if (originPositopn.top + moveY < 0) {
            moveY = -originPositopn.top
          }
          if (originPositopn.width + moveX < minWidth) {
            moveX = minWidth - originPositopn.width
          }
          if (originPositopn.height - moveY < minHeight) {
            moveY = originPositopn.height - minHeight
          }
          targetWidth = originPositopn.width + moveX
          targetHeight = originPositopn.height - moveY
          targetLeft = originPositopn.left
          targetTop = originPositopn.top + moveY
        }
        else if (type === 'b-l') {
          if (originPositopn.left + moveX < 0) {
            moveX = -originPositopn.left
          }
          if (originPositopn.top + originPositopn.height + moveY > bottomPosition.height) {
            moveY = bottomPosition.height - (originPositopn.top + originPositopn.height)
          }
          if (originPositopn.width - moveX < minWidth) {
            moveX = originPositopn.width - minWidth
          }
          if (originPositopn.height + moveY < minHeight) {
            moveY = minHeight - originPositopn.height
          }
          targetWidth = originPositopn.width - moveX
          targetHeight = originPositopn.height + moveY
          targetLeft = originPositopn.left + moveX
          targetTop = originPositopn.top
        }
        else {
          if (originPositopn.left + originPositopn.width + moveX > bottomPosition.width) {
            moveX = bottomPosition.width - (originPositopn.left + originPositopn.width)
          }
          if (originPositopn.top + originPositopn.height + moveY > bottomPosition.height) {
            moveY = bottomPosition.height - (originPositopn.top + originPositopn.height)
          }
          if (originPositopn.width + moveX < minWidth) {
            moveX = minWidth - originPositopn.width
          }
          if (originPositopn.height + moveY < minHeight) {
            moveY = minHeight - originPositopn.height
          }
          targetWidth = originPositopn.width + moveX
          targetHeight = originPositopn.height + moveY
          targetLeft = originPositopn.left
          targetTop = originPositopn.top
        }
        
        topImgWrapperPosition.left = targetLeft
        topImgWrapperPosition.top = targetTop
        topImgWrapperPosition.width = targetWidth
        topImgWrapperPosition.height = targetHeight
      }

      document.onmouseup = () => {
        isMouseDown = false
        document.onmousemove = null
        document.onmouseup = null

        getRange()

        setTimeout(() => isSettingClipRange.value = false, 0)
      }
    }

    return {
      clipWrapperPositionStyle,
      bottomImgPositionStyle,
      topImgWrapperPositionStyle,
      topImgPositionStyle,
      handleClip,
      moveClipRange,
      scaleClipRange,
    }
  },
})
</script>

<style lang="scss" scoped>
.image-clip-handler {
  width: 100%;
  height: 100%;
  position: relative;

  .bottom-img {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: .5;
  }

  img {
    width: 100%;
    height: 100%;
  }

  .top-image-content {
    position: absolute;
    overflow: hidden;

    img {
      position: absolute;
    }
  }
}

.operate {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  cursor: move;
}

.clip-point {
  position: absolute;
  width: 12px;
  height: 12px;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  display: flex;
  justify-content: center;
  align-items: center;

  svg {
    overflow: visible;
  }

  &.t-l {
    cursor: nwse-resize;
    left: 0;
    top: 0;
  }
  &.t-r {
    cursor: nesw-resize;
    left: 100%;
    top: 0;
    transform: rotate(90deg);
  }
  &.b-l {
    cursor: nesw-resize;
    left: 0;
    top: 100%;
    transform: rotate(-90deg);
  }
  &.b-r {
    cursor: nwse-resize;
    left: 100%;
    top: 100%;
    transform: rotate(180deg);
  }
}
</style>