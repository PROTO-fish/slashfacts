// Two-finger zoom and double-tap zoom would fight the gesture surface.
document.addEventListener('gesturestart', (event) => event.preventDefault());

// Offline shell (public/sw.js). Not in development, where it would serve stale bundles.
if ('serviceWorker' in navigator && !__DEV__) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
