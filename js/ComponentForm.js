import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HologramUIForm } from './HologramUIForm.js';

export class ComponentForm {
    constructor(canvasId, callbacks) {
        this.canvas = document.getElementById(canvasId);
        this.callbacks = callbacks || {};
        this.uiForm = new HologramUIForm();
        
        this.caseModel = null;
        this.hotspotEls = [];
        this.modelCache = {};

        this.components = [
            { id: 'motherboard', label: 'Motherboard', sub: 'Component 01', desc: 'The board every other part plugs into — it routes power and data between the CPU, memory, storage and everything else.', file: 'motherboard_3d_model.glb', position: new THREE.Vector3(-0.16, 0.73, -0.06) },
            { id: 'cpu', label: 'CPU', sub: 'Component 02', desc: 'The processor, seated in the motherboard’s socket beneath the cooler. This is where the actual computation happens.', file: 'amd_ryzen_processor_3d_model.glb', position: new THREE.Vector3(-0.16, 0.66, -0.06) },
            { id: 'fan', label: 'CPU Cooling Fan', sub: 'Component 03', desc: 'Mounted over the CPU to pull heat away from it.', file: 'digital_thermostat_3d_model.glb', position: new THREE.Vector3(0.02, 0.80, 0.06) },
            { id: 'psu', label: 'Power Supply', sub: 'Component 04', desc: 'Converts wall AC into the stable DC power every component in the case draws from.', file: 'pc_power_supply_3d_model.glb', position: new THREE.Vector3(-0.45, 0.20, -0.01) }
        ];

        this.initMainScene();
        this.initModalElements();
        this.initBiometricGate();
        this.initWebcamGestures();
        this.animate();
    }

    initBiometricGate() {
        const gate = document.getElementById('biometric-gate');
        const bypassBtn = document.getElementById('bypass-gate-btn');
        const verifyBtn = document.getElementById('verify-btn');

        if (bypassBtn) {
            bypassBtn.addEventListener('click', () => {
                if (gate) gate.classList.add('unlocked');
            });
        }
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => {
                if (gate) gate.classList.add('unlocked');
            });
        }
    }

    initMainScene() {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;

        this.scene = new THREE.Scene();
        this.scene.background = null; 

        this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 100);
        this.camera.position.set(1.4, 1.1, 1.6);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 0.6;
        this.controls.maxDistance = 6;
        this.controls.target.set(0, 0.45, 0);

        this.isAutoOrbiting = false;
        this.autoOrbitSpeed = 0.008;
        this.initAutoOrbitButton();

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x111827, 1.2));
        const key = new THREE.DirectionalLight(0xffffff, 1.8);
        key.position.set(2.5, 3.5, 2);
        this.scene.add(key);
        const rim = new THREE.DirectionalLight(0x00bcd4, 1.2);
        rim.position.set(-3, 1.5, -2);
        this.scene.add(rim);

        const grid = new THREE.GridHelper(4, 24, 0x1f293d, 0x111827);
        grid.position.y = 0;
        this.scene.add(grid);

        window.addEventListener('resize', () => this.resize());
        this.loadCaseModel();
    }

    initAutoOrbitButton() {
        const btn = document.getElementById('auto-orbit-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            this.isAutoOrbiting = !this.isAutoOrbiting;
            btn.textContent = this.isAutoOrbiting ? 'AUTO ORBIT: ON' : 'AUTO ORBIT: OFF';
            btn.style.background = this.isAutoOrbiting ? 'var(--cyan)' : 'transparent';
            btn.style.color = this.isAutoOrbiting ? '#000' : 'var(--cyan)';
        });
    }

    resize() {
        if (!this.canvas) return;
        const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    loadCaseModel() {
        const loader = new GLTFLoader();
        loader.load(
            'gaming_computer_case_3d_model.glb',
            (gltf) => {
                this.caseModel = gltf.scene;
                this.scene.add(this.caseModel);
                const box = new THREE.Box3().setFromObject(this.caseModel);
                const center = new THREE.Vector3(); box.getCenter(center);
                this.controls.target.copy(center);
                this.uiForm.hideLoadingScreen();
                this.buildHotspots();
            },
            (evt) => {
                if (evt.lengthComputable) {
                    this.uiForm.updateLoadingProgress(Math.round((evt.loaded / evt.total) * 100));
                }
            },
            (err) => { console.error('Error loading model:', err); }
        );
    }

    buildHotspots() {
        const hotspotLayer = document.getElementById('hotspot-layer');
        if (!hotspotLayer) return;

        this.components.forEach((c) => {
            const el = document.createElement('div');
            el.className = 'hotspot';
            el.innerHTML = `<div class="ring"></div><div class="core"></div><div class="tag">${c.label}</div>`;
            el.addEventListener('mouseenter', () => el.classList.add('hover'));
            el.addEventListener('mouseleave', () => el.classList.remove('hover'));
            el.addEventListener('click', () => {
                this.openModal(c);
                if (this.callbacks.onComponentSelected) this.callbacks.onComponentSelected(c);
            });
            hotspotLayer.appendChild(el);
            this.hotspotEls.push({ el, comp: c });
        });
    }

    updateHotspots() {
        if (!this.caseModel) return;
        const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
        const _v = new THREE.Vector3();

        this.caseModel.updateMatrixWorld();

        this.hotspotEls.forEach(({ el, comp }) => {
            _v.copy(comp.position).applyMatrix4(this.caseModel.matrixWorld);
            _v.project(this.camera);

            if (_v.z >= 1) { el.style.display = 'none'; return; }
            el.style.display = 'flex';
            el.style.left = ((_v.x * 0.5 + 0.5) * w) + 'px';
            el.style.top = ((-_v.y * 0.5 + 0.5) * h) + 'px';
        });
    }

    initModalElements() {
        this.modal = document.getElementById('modal');
        this.modalPanel = document.getElementById('modal-panel');
        
        this.modalPanel.innerHTML = `
            <div id="modal-head">
                <div>
                    <div id="modal-sub">COMPONENT TELEMETRY</div>
                    <div id="modal-title">—</div>
                </div>
                <button id="modal-close">✕</button>
            </div>
            <div id="modal-body-layout">
                <div class="hud-side-panel">
                    <div class="hud-box">
                        <div class="hud-box-title">// Specification</div>
                        <p id="modal-desc">—</p>
                    </div>
                    <div class="hud-box">
                        <div class="hud-box-title">// Status</div>
                        <div style="font-family: var(--mono); font-size: 12px; color: var(--cyan);">ONLINE [SECURE]</div>
                    </div>
                </div>

                <div id="modal-canvas-wrap">
                    <canvas id="modal-canvas"></canvas>
                    <div id="modal-loading">
                        <div class="spin"></div>
                        <div class="pct" id="modal-pct">0%</div>
                    </div>
                    <div id="modal-note">drag to orbit · scroll to zoom</div>
                </div>

                <div class="hud-side-panel right">
                    <div class="hud-box">
                        <div class="hud-box-title">// Diagnostics</div>
                        <div style="font-family: var(--mono); font-size: 11px; color: var(--dim); line-height: 1.6;">
                            PE-55.87.41 &nbsp; PT-80.31.57<br>
                            ZX-76.90.24 &nbsp; WQ-51.38.00<br>
                            RE-57.00.34 &nbsp; TY-21.17.90
                        </div>
                    </div>
                    <div class="hud-box">
                        <div class="hud-box-title">// System Frequency</div>
                        <div style="font-family: var(--mono); font-size: 14px; color: var(--yellow); font-weight: bold;">67.11.48 GHz</div>
                    </div>
                </div>
            </div>
        `;

        this.modalCanvas = document.getElementById('modal-canvas');
        this.modalTitle = document.getElementById('modal-title');
        this.modalSub = document.getElementById('modal-sub');
        this.modalDesc = document.getElementById('modal-desc');
        this.modalLoading = document.getElementById('modal-loading');
        this.modalPct = document.getElementById('modal-pct');
        this.modalCloseBtn = document.getElementById('modal-close');

        if (this.modalCloseBtn) this.modalCloseBtn.addEventListener('click', () => this.closeModal());
        if (this.modal) this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeModal(); });
    }

    initModalSceneIfNeeded() {
        if (this.modalRenderer) return;
        this.modalRenderer = new THREE.WebGLRenderer({ canvas: this.modalCanvas, antialias: true, alpha: true });
        this.modalRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.modalRenderer.outputColorSpace = THREE.SRGBColorSpace;

        this.modalScene = new THREE.Scene();
        this.modalCamera = new THREE.PerspectiveCamera(38, 1, 0.001, 1000);
        this.modalControls = new OrbitControls(this.modalCamera, this.modalRenderer.domElement);
        this.modalControls.enableDamping = true;
        this.modalControls.dampingFactor = 0.08;

        this.modalScene.add(new THREE.HemisphereLight(0xffffff, 0x111827, 1.2));
        const k = new THREE.DirectionalLight(0xffffff, 1.8); 
        k.position.set(2, 3, 2); 
        this.modalScene.add(k);
    }

    openModal(comp) {
        if (!this.modal) return;
        this.modalTitle.textContent = comp.label;
        this.modalSub.textContent = comp.sub;
        this.modalDesc.textContent = comp.desc;
        this.modal.classList.add('open');

        this.initModalSceneIfNeeded();
        [...this.modalScene.children].forEach((o) => { if (o.userData.isLoadedModel) this.modalScene.remove(o); });

        this.modalLoading.style.display = 'flex';
        this.modalPct.textContent = '0%';

        const showObject = (obj) => {
            obj.userData.isLoadedModel = true;
            this.modalScene.add(obj);

            const box = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3(); box.getSize(size);
            const center = new THREE.Vector3(); box.getCenter(center);
            this.modalControls.target.copy(center);
            const dist = Math.max(size.x, size.y, size.z) * 1.9 || 1;
            this.modalCamera.position.set(center.x + dist * 0.6, center.y + dist * 0.5, center.z + dist * 0.8);
            this.modalCamera.near = dist / 100; this.modalCamera.far = dist * 50;
            this.modalCamera.updateProjectionMatrix();

            this.modalLoading.style.display = 'none';
        };

        const loader = new GLTFLoader();
        if (this.modelCache[comp.file]) {
            showObject(this.modelCache[comp.file].clone(true));
        } else {
            loader.load(
                comp.file,
                (gltf) => {
                    this.modelCache[comp.file] = gltf.scene;
                    showObject(gltf.scene.clone(true));
                },
                (evt) => { if (evt.lengthComputable) this.modalPct.textContent = Math.round((evt.loaded / evt.total) * 100) + '%'; },
                (err) => { this.modalPct.textContent = 'error'; console.error(err); }
            );
        }
    }

    closeModal() {
        if (this.modal) this.modal.classList.remove('open');
    }

async initWebcamGestures() {
        const videoElement = document.getElementById('webcam-video');
        const regStatus = document.getElementById('reg-status');
        const verifyBtn = document.getElementById('verify-btn');
        const biometricGate = document.getElementById('biometric-gate');

        if (!videoElement) {
            console.error("Error: #webcam-video element not found!");
            return;
        }

        if (regStatus) {
            regStatus.textContent = 'STATUS: INA-LOAD ANG CAMERA AT MEDIAPIPE AI...';
            regStatus.style.color = 'var(--yellow)';
        }

        try {
            // 1. I-initialize ang MediaPipe Hands
            const hands = new window.Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6
            });

            let prevX = null;
            let prevY = null;

            hands.onResults((results) => {
                if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
                    prevX = null;
                    prevY = null;
                    if (regStatus && !biometricGate.classList.contains('unlocked')) {
                        regStatus.textContent = 'STATUS: CAMERA AKTIBO - IPAKITA ANG KAMAY';
                        regStatus.style.color = 'var(--yellow)';
                    }
                    return;
                }

                // Kapag nakita ang kamay, i-enable ang Verify button o i-unlock
                if (regStatus && verifyBtn && !biometricGate.classList.contains('unlocked')) {
                    regStatus.textContent = 'STATUS: NAKITA ANG KAMAY! I-CLICK ANG VERIFY';
                    regStatus.style.color = 'var(--cyan)';
                    verifyBtn.removeAttribute('disabled');
                    verifyBtn.style.cursor = 'pointer';
                    verifyBtn.style.background = 'var(--cyan)';
                    verifyBtn.style.color = '#000';
                }

                const landmarks = results.multiHandLandmarks[0];
                const indexTip = landmarks[8]; // Index finger tip

                // Kung naka-unlock na ang gate, pwede na galawin ang 3D model gamit ang daliri
                if (prevX !== null && prevY !== null && biometricGate.classList.contains('unlocked')) {
                    const deltaX = (indexTip.x - prevX) * 100;
                    const deltaY = (indexTip.y - prevY) * 100;

                    if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
                        if (Math.abs(deltaX) > Math.abs(deltaY)) {
                            if (this.caseModel) {
                                this.caseModel.rotation.y += deltaX * 0.02;
                            }
                        } else {
                            if (this.camera) {
                                this.camera.position.z += deltaY * 0.02;
                            }
                        }
                    }
                }

                prevX = indexTip.x;
                prevY = indexTip.y;
            });

            // 2. Gamitin ang official window.Camera utility para sa smooth stream
            const camera = new window.Camera(videoElement, {
                onFrame: async () => {
                    await hands.send({ image: videoElement });
                },
                width: 640,
                height: 480
            });

            await camera.start();

            if (regStatus) {
                regStatus.textContent = 'STATUS: HAND TRACKING HANDA NA. IPAKITA ANG KAMAY.';
                regStatus.style.color = 'var(--cyan)';
            }

        } catch (err) {
            console.error('Camera/MediaPipe Error:', err);
            if (regStatus) {
                regStatus.textContent = 'ERROR SA CAMERA: ' + err.message;
                regStatus.style.color = '#ff5252';
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.resize();

        if (this.isAutoOrbiting && this.caseModel) {
            this.caseModel.rotation.y += this.autoOrbitSpeed;
        }

        this.controls.update();
        this.updateHotspots();
        this.renderer.render(this.scene, this.camera);

        if (this.modal && this.modal.classList.contains('open') && this.modalRenderer) {
            const w = this.modalCanvas.clientWidth, h = this.modalCanvas.clientHeight;
            this.modalRenderer.setSize(w, h, false);
            this.modalCamera.aspect = w / h;
            this.modalCamera.updateProjectionMatrix();
            this.modalControls.update();
            this.modalRenderer.render(this.modalScene, this.modalCamera);
        }
    }
}