import './style.css';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const APP_CONFIG = {
  TITLE: 'WH40K 2D Board Game Simulator',
  VERSION: '0.1.0-alpha',
  PHASE: 'Phase 0 - Setup Complete',
} as const;

// =========================================================================
// 📦 BOOTSTRAP IMPLEMENTATION
// =========================================================================
const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `
    <div class="welcome-screen">
      <h1 class="welcome-title">${APP_CONFIG.TITLE}</h1>
      <p class="welcome-subtitle">
        Warhammer 40,000 (10th Edition) Tabletop Miniature Simulator
      </p>
      <div class="status-badge">
        ✓ ${APP_CONFIG.PHASE} (v${APP_CONFIG.VERSION})
      </div>
    </div>
  `;
}
