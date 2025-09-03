<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  html: string
}>()

/* --- simple modal/lightbox state --- */
const show = ref(false)
const modalSrc = ref('')
const modalAlt = ref('')

function open(src: string, alt = '') {
  if (!src) return
  modalSrc.value = src
  modalAlt.value = alt
  show.value = true
}
function close() {
  show.value = false
  modalSrc.value = ''
  modalAlt.value = ''
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
watch(show, v => {
  if (typeof document === 'undefined') return
  document.documentElement.style.overflow = v ? 'hidden' : ''
  v ? document.addEventListener('keydown', onKey) : document.removeEventListener('keydown', onKey)
})

/* event delegation: catch clicks on any <img> inside the HTML */
function onHostClick(e: MouseEvent) {
  const t = e.target as HTMLElement | null
  if (!t) return
  if (t.tagName === 'IMG') {
    const img = t as HTMLImageElement
    open(img.src, img.alt || '')
  }
}

onMounted(() => {})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <div class="single-product-description prose max-w-none" @click.capture="onHostClick">
    <!-- your CMS/html content -->
    <div v-html="html" />
  </div>

  <!-- Modal / Lightbox -->
  <teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-label="Image preview"
      @click.self="close"
    >
      <button
        class="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
        aria-label="Close" @click="close">✕</button>

      <img
        :src="modalSrc"
        :alt="modalAlt || 'image'"
        class="max-h-[90vh] max-w-[92vw] rounded-xl shadow-2xl object-contain"
        draggable="false"
      />
    </div>
  </teleport>
</template>

<style>
/* -------- Design tokens (scoped to the block) -------- */
.single-product-description {
  --tlk-text: #1f2937;          /* slate-800 */
  --tlk-muted: #6b7280;         /* gray-500  */
  --tlk-border: #e5e7eb;        /* gray-200  */
  --tlk-bg-alt: #f9fafb;        /* gray-50   */
  --tlk-accent: #892118;        /* brand deep red */
  --tlk-accent-2: #ff6800;      /* brand orange   */
  --rhythm: 1.1rem;             /* vertical rhythm */
  color: var(--tlk-text);
  font-size: 16px;
  line-height: 1.75;
}

/* -------- Headings with gradient underline bar -------- */
.single-product-description h1,
.single-product-description h2,
.single-product-description h3,
.single-product-description h4,
.single-product-description h5 {
  font-weight: 700;
  color: var(--tlk-accent);
  margin: calc(var(--rhythm) * 1.2) 0 .6rem;
  line-height: 1.25;
  position: relative;
  max-width: fit-content;
  padding-bottom: .25rem;
}
.single-product-description h1 { font-size: 2rem; }
.single-product-description h2 { font-size: 1.625rem; }
.single-product-description h3 { font-size: 1.375rem; color: #b3241a; }
.single-product-description h4 { font-size: 1.125rem; color: #4b5563; font-weight: 600; }
.single-product-description h5 { font-size: 1.0625rem; color: #4b5563; }

.single-product-description h1::after,
.single-product-description h2::after,
.single-product-description h3::after,
.single-product-description h4::after,
.single-product-description h5::after{
  content: "";
  position: absolute;
  left: 0; bottom: 0;
  height: 3px;
  width: 100%;
  background: linear-gradient(90deg, var(--tlk-accent), var(--tlk-accent-2));
  border-radius: 999px;
}

/* -------- Paragraphs -------- */
.single-product-description p {
  margin: .8rem 0;
  color: var(--tlk-text);
  letter-spacing: .01rem;
  text-wrap: pretty;
}

/* -------- Links -------- */
.single-product-description a {
  color: #0f766e;               /* teal-700 */
  font-weight: 600;
  text-decoration: underline transparent;
  text-underline-offset: 3px;
  transition: color .2s ease, text-decoration-color .2s ease;
}
.single-product-description a:hover { text-decoration-color: currentColor; }

/* -------- Lists -------- */
.single-product-description ul,
.single-product-description ol {
  margin: .75rem 0 .75rem 1.25rem;
  color: #374151;
}
.single-product-description ul { list-style: disc; }
.single-product-description ol { list-style: decimal; }
.single-product-description li { margin: .25rem 0; }

/* -------- Tables -------- */
.single-product-description table{
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 1rem 0;
  border: 1px solid var(--tlk-border);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  font-size: 15px;
}
.single-product-description thead th{
  background: linear-gradient(0deg, #f3f4f6, #ffffff);
  color: #111827;
  text-transform: uppercase;
  letter-spacing: .03em;
  font-weight: 700;
  font-size: .82rem;
}
.single-product-description th,
.single-product-description td{
  padding: 10px 12px;
  border-right: 1px solid var(--tlk-border);
  border-bottom: 1px solid var(--tlk-border);
  vertical-align: middle;
}
.single-product-description tr:last-child td { border-bottom: 0; }
.single-product-description tr td:last-child,
.single-product-description tr th:last-child { border-right: 0; }
.single-product-description tbody tr:nth-child(odd){ background: var(--tlk-bg-alt); }

.single-product-description .table-image,
.single-product-description table img{
  max-width: 160px;
  height: auto;
  display: block;
  margin: 0 auto;
  mix-blend-mode: multiply;
}

/* -------- Images (clickable to open modal) -------- */

@media screen and (min-width:767px){
  .single-product-description img{
    max-width: 400px;
  }
}
.single-product-description img{
  height: auto;
  display: block;
  /* margin: .5rem auto; */
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
  cursor: zoom-in;
  transition: transform .15s ease, box-shadow .15s ease;
}
.single-product-description img:hover{
  transform: translateY(-1px);
  box-shadow: 0 10px 28px rgba(0,0,0,.10);
}

/* Responsive helper from your code */
img.width33 { display:inline-block; max-width:600px; margin:15px; }

/* -------- Iframes / embedded media -------- */
.single-product-description iframe{
  width: 100%;
  aspect-ratio: 16 / 9;
  border: none;
  border-radius: 12px;
  background: #000;
}

/* -------- Small elements -------- */
.single-product-description span{
  font-size: 16px;
  line-height: 30px;
  letter-spacing: .02rem;
}

/* Optional: tighter spacing after big figures or tables */
.single-product-description figure,
.single-product-description table { margin-bottom: 1.25rem; }
</style>
