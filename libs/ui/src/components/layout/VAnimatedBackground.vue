<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from "vue";

interface Blob {
  x: number
  y: number
  radius: number
  vx: number
  vy: number
  color: string
}

interface Props {
  blobCount?: number
  blobRadius?: { min: number, max: number }
  blobSpeed?: number
  blobOpacity?: number
}

const {
  blobCount = 8,
  blobRadius = { min: 100, max: 300 },
  blobSpeed = 0.8,
  blobOpacity = 0.35,
} = defineProps<Props>();

const BLOB_VARS = ["--primary", "--info", "--success", "--warning"];

const canvasRef = ref<HTMLCanvasElement | null>(null);

let animationFrameId: number;
let resizeTimer: ReturnType<typeof setTimeout>;
const blobs: Blob[] = [];

const initBlobs = (canvas: HTMLCanvasElement) => {
  blobs.length = 0;
  const style = getComputedStyle(document.documentElement);

  for (let i = 0; i < blobCount; i++) {
    blobs.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * (blobRadius.max - blobRadius.min) + blobRadius.min,
      vx: (Math.random() - 0.5) * blobSpeed,
      vy: (Math.random() - 0.5) * blobSpeed,
      color: style.getPropertyValue(BLOB_VARS[i % BLOB_VARS.length]).trim(),
    });
  }
};

const animate = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.filter = "blur(70px)";

  blobs.forEach((blob) => {
    blob.x += blob.vx;
    blob.y += blob.vy;

    if (blob.x < -blob.radius || blob.x > canvas.width + blob.radius) blob.vx *= -1;
    if (blob.y < -blob.radius || blob.y > canvas.height + blob.radius) blob.vy *= -1;

    ctx.globalAlpha = blobOpacity;
    ctx.fillStyle = blob.color;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.filter = "none";
  ctx.globalAlpha = 1;

  animationFrameId = requestAnimationFrame(() => animate(canvas, ctx));
};

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initBlobs(canvas);
  };

  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  };

  resize();
  window.addEventListener("resize", handleResize);
  animate(canvas, ctx);

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
    cancelAnimationFrame(animationFrameId);
    clearTimeout(resizeTimer);
    blobs.length = 0;
  });
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 pointer-events-none"
  />
</template>
