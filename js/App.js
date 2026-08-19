import { HologramUIForm } from './HologramUIForm.js';
import { ComponentForm } from './ComponentForm.js';
import { AudioForm } from './AudioForm.js';
import { GestureControlForm } from './GestureControlForm.js';

class App {
    constructor() {
        this.initModules();
    }

    initModules() {
        console.log("Initializing Main Hologram Application...");

        // Form 1: Hologram UI & HUD Layer
        this.uiForm = new HologramUIForm();

        // Form 2: 3D System Unit & Components (Case, PSU, Mobo, CPU, Cooler, RAM, SSD, GPU)
        this.componentForm = new ComponentForm('main-canvas', {
            onComponentSelected: (component) => {
                // Form 3: Audio Narration triggers only when a component is selected
                this.audioForm.playExplanation(component);
            }
        });

        // Form 4: MediaPipe Hand Gesture Control (Webcam rotation/zoom/select)
        this.gestureForm = new GestureControlForm({
            onRotate: (dx, dy) => this.componentForm.rotateByGesture(dx, dy),
            onZoom: (zoomDelta) => this.componentForm.zoomByGesture(zoomDelta),
            onSelect: () => this.componentForm.selectActiveHotspot()
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.appInstance = new App();
});