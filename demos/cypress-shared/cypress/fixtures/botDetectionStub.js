export const botDetection = {
    detectBot: async () => {
        window.__botDetected=false
        return false;
    }
};