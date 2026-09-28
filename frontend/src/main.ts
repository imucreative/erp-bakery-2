import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import App from './App.vue';
import { router } from './router';
import { useAuthStore } from './stores/auth';
import { setUnauthorizedHandler } from './lib/api';
import { useTheme } from './composables/useTheme';
import './style.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// Rehydrate identity from any persisted token before the router guard runs.
const authStore = useAuthStore(pinia);
authStore.hydrateFromStorage();

// When a refresh ultimately fails, force the user back to login.
setUnauthorizedHandler(() => {
  authStore.reset();
  void router.push({ name: 'login' });
});

// Apply persisted / system dark-mode preference.
useTheme().initTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

app.use(router);
app.use(VueQueryPlugin, { queryClient });

app.mount('#app');
