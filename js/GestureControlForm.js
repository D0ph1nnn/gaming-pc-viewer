export class GestureControlForm {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.initWebcamTracking();
    }

    initWebcamGestures() {
        const videoElement = document.getElementById('webcam-video');
        if (!videoElement) return;

        if (!window.Hands || !window.Camera) {
            console.warn('MediaPipe scripts not loaded.');
            return;
        }

        try {
            const hands = new window.Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7
            });

            let prevX = null;
            let prevY = null;

            hands.onResults((results) => {
                if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
                    prevX = null;
                    prevY = null;
                    return;
                }

                const landmarks = results.multiHandLandmarks[0];
                const indexTip = landmarks[8]; // Index finger tip tracking

                if (prevX !== null && prevY !== null) {
                    const deltaX = (indexTip.x - prevX) * 100;
                    const deltaY = (indexTip.y - prevY) * 100;

                    if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
                        // Swipe Left / Right -> Rotate model
                        if (Math.abs(deltaX) > Math.abs(deltaY)) {
                            if (this.caseModel) {
                                this.caseModel.rotation.y += deltaX * 0.02;
                            }
                        } 
                        // Swipe Up / Down -> Zoom camera
                        else {
                            if (this.camera) {
                                this.camera.position.z += deltaY * 0.02;
                            }
                        }
                    }
                }

                prevX = indexTip.x;
                prevY = indexTip.y;
            });

            const cameraUtils = new window.Camera(videoElement, {
                onFrame: async () => {
                    try {
                        await hands.send({ image: videoElement });
                    } catch (e) {
                        // Suppress frame errors if busy
                    }
                },
                width: 640,
                height: 480
            });

            // Catch camera busy/locked errors gracefully so the app keeps working
            cameraUtils.start().catch((err) => {
                console.warn('Camera is currently in use (e.g. by your meeting). Gestures are paused, but 3D viewer is fully functional via mouse/keyboard.');
            });

        } catch (e) {
            console.warn('Webcam setup bypassed safely.');
        }
    }
}