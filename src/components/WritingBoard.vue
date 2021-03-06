<template>
  <div class="writing-board" ref="writingBoardRef">
    <canvas class="canvas" ref="canvasRef"
      @mousedown="$event => handleMousedown($event)"
      @mousemove="$event => handleMousemove($event)"
      @mouseup="handleMouseup()"
      @mouseleave="handleMouseup(); mouseInCanvas = false"
      @mouseenter="mouseInCanvas = true"
    ></canvas>

    <div 
      class="pen"
      :style="{
        left: mouse.x - penSize / 2 + 'px',
        top: mouse.y - 36 + penSize / 2 + 'px',
        color: color,
      }"
      v-if="mouseInCanvas && model === 'pen'"
    ><IconWrite class="icon" size="36" /></div>
    
    <div 
      class="eraser"
      :style="{
        left: mouse.x - rubberSize / 2 + 'px',
        top: mouse.y - rubberSize / 2 + 'px',
        width: rubberSize + 'px',
        height: rubberSize + 'px',
      }"
      v-if="mouseInCanvas && model === 'eraser'"
    ><IconClearFormat class="icon" :size="rubberSize * 0.6" /></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, reactive, ref } from 'vue'

const penSize = 6
const rubberSize = 80

export default defineComponent({
  name: 'writing-board',
  props: {
    color: {
      type: String,
      default: '#ffcc00',
    },
    model: {
      type: String as PropType<'pen' | 'eraser'>,
      default: 'pen',
    },
  },
  setup(props) {
    let ctx: CanvasRenderingContext2D | null = null
    const writingBoardRef = ref<HTMLElement>()
    const canvasRef = ref<HTMLCanvasElement>()
    let lastPos = {
      x: 0,
      y: 0,
    }
    let isMouseDown = false
    let lastTime = 0
    let lastLineWidth = -1

    const mouse = reactive({
      x: 0,
      y: 0,
    })
    const mouseInCanvas = ref(false)

    const initCanvas = () => {
      if (!canvasRef.value || !writingBoardRef.value) return

      ctx = canvasRef.value.getContext('2d')
      if (!ctx) return

      canvasRef.value.width = writingBoardRef.value.clientWidth
      canvasRef.value.height = writingBoardRef.value.clientHeight

      canvasRef.value.style.width = writingBoardRef.value.clientWidth + 'px'
      canvasRef.value.style.height = writingBoardRef.value.clientHeight + 'px'

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }

    const getDistance = (posX: number, posY: number) => {
      const lastPosX = lastPos.x
      const lastPosY = lastPos.y
      return Math.sqrt((posX - lastPosX) * (posX - lastPosX) + (posY - lastPosY) * (posY - lastPosY))
    }

    const getLineWidth = (s: number, t: number) => {
      const maxV = 10
      const minV = 0.1
      const maxWidth = penSize
      const minWidth = 3
      const v = s / t
      let lineWidth

      if (v <= minV) lineWidth = maxWidth
      else if (v >= maxV) lineWidth = minWidth
      else lineWidth = maxWidth - v / maxV * maxWidth

      if (lastLineWidth === -1) return lineWidth
      return lineWidth * 1 / 3 + lastLineWidth * 2 / 3
    }

    // 画笔绘制方法
    const draw = (posX: number, posY: number, lineWidth: number) => {
      if (!ctx) return

      const lastPosX = lastPos.x
      const lastPosY = lastPos.y

      ctx.lineWidth = lineWidth
      ctx.strokeStyle = props.color
      ctx.beginPath()
      ctx.moveTo(lastPosX, lastPosY)
      ctx.lineTo(posX, posY)
      ctx.stroke()
      ctx.closePath()
    }

    // 橡皮擦除方法
    const erase = (posX: number, posY: number) => {
      if (!ctx || !canvasRef.value) return
      const lastPosX = lastPos.x
      const lastPosY = lastPos.y

      const radius = rubberSize / 2

      const sinRadius = radius * Math.sin(Math.atan((posY - lastPosY) / (posX - lastPosX)))
      const cosRadius = radius * Math.cos(Math.atan((posY - lastPosY) / (posX - lastPosX)))
      const rectPoint1: [number, number] = [lastPosX + sinRadius, lastPosY - cosRadius]
      const rectPoint2: [number, number] = [lastPosX - sinRadius, lastPosY + cosRadius]
      const rectPoint3: [number, number] = [posX + sinRadius, posY - cosRadius]
      const rectPoint4: [number, number] = [posX - sinRadius, posY + cosRadius]

      ctx.save()
      ctx.beginPath()
      ctx.arc(posX, posY, radius, 0, Math.PI * 2)
      ctx.clip()
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
      ctx.restore()

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(...rectPoint1)
      ctx.lineTo(...rectPoint3)
      ctx.lineTo(...rectPoint4)
      ctx.lineTo(...rectPoint2)
      ctx.closePath()
      ctx.clip()
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
      ctx.restore()
    }

    const startDraw = (posX: number, posY: number) => {
      lastPos = { x: posX, y: posY }
      lastTime = new Date().getTime()
    }

    const startMove = (posX: number, posY: number) => {
      const time = new Date().getTime()

      // 画笔模式（这里通过绘制速度调节画笔的粗细）
      if (props.model === 'pen') {
        const s = getDistance(posX, posY)
        const t = time - lastTime
        const lineWidth = getLineWidth(s, t)
  
        draw(posX, posY, lineWidth)
        lastLineWidth = lineWidth
      }
      // 橡皮模式
      else erase(posX, posY)

      lastPos = { x: posX, y: posY }
      lastTime = new Date().getTime()
    }

    const handleMousedown = (e: MouseEvent) => {
      isMouseDown = true
      startDraw(e.offsetX, e.offsetY)
    }

    const updateMousePosition = (e: MouseEvent) => {
      mouse.x = e.pageX
      mouse.y = e.pageY
    }

    const handleMousemove = (e: MouseEvent) => {
      updateMousePosition(e)

      if (!isMouseDown) return
      startMove(e.offsetX, e.offsetY)
    }

    const handleMouseup = () => {
      if (!isMouseDown) return
      isMouseDown = false
    }

    // 清空画布
    const clearCanvas = () => {
      if (!ctx || !canvasRef.value) return
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    }

    onMounted(initCanvas)

    return {
      mouse,
      mouseInCanvas,
      penSize,
      rubberSize,
      writingBoardRef,
      canvasRef,
      handleMousedown,
      handleMousemove,
      handleMouseup,
      clearCanvas,
    }
  },
})
</script>

<style lang="scss" scoped>
.writing-board {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 8;
  cursor: none;
}
.eraser, .pen {
  pointer-events: none;
  position: fixed;
  z-index: 9;

  .icon {
    filter: drop-shadow(2px 2px 2px #555);
  }
}
.eraser {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  border: 4px solid rgba($color: #555, $alpha: .15);
  color: rgba($color: #555, $alpha: .75);
}
</style>