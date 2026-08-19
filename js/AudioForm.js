export class AudioForm {
    constructor() {
        this.synth = window.speechSynthesis;
    }

    playExplanation(component) {
        if (!component) return;
        this.synth.cancel(); // Stop prior audio

        const narration = `Selected ${component.label}. ${component.desc}`;
        const utterance = new SpeechSynthesisUtterance(narration);
        
        this.synth.speak(utterance);
        console.log(`Playing audio explanation for: ${component.label}`);
    }
}