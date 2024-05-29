import { load } from '@fingerprintjs/botd';

export const botDetection = {
    detectBot: async () => {
        try {
            const botd = await load();
            const result = botd.detect();

            console.log(JSON.stringify(result))

            return result.bot; // Return true if bot is detected, false otherwise
        } catch (error) {
            console.error('Error detecting bot:', error);
            return false; // Return false in case of error
        }
    }
};
