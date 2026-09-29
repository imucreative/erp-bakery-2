import './assets/main.css'
// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'jsvectormap/dist/jsvectormap.css'
import 'flatpickr/dist/flatpickr.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import VueApexCharts from 'vue3-apexcharts'
import { initRTL } from './composables/useRTL'
import { useAuthStore } from './stores/auth'
import { setUnauthorizedHandler } from './services/http'

initRTL()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Rehydrate identity from any persisted token before the router guard runs.
const authStore = useAuthStore(pinia)
authStore.hydrateFromStorage()

// When a token refresh ultimately fails, force the user back to sign-in.
setUnauthorizedHandler(() => {
  authStore.reset()
  void router.push({ name: 'Signin' })
})

app.use(router)
app.use(VueApexCharts)

app.mount('#app')

