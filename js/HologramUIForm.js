export class HologramUIForm {
    constructor() {
        this.loadingEl = document.getElementById('loading');
        this.loadingPct = document.getElementById('loading-pct');
    }

    updateLoadingProgress(percent) {
        if (this.loadingPct) {
            this.loadingPct.textContent = percent + '%';
        }
    }

    hideLoadingScreen() {
        if (this.loadingEl) {
            this.loadingEl.style.opacity = '0';
            setTimeout(() => this.loadingEl.style.display = 'none', 400);
        }
    }
}