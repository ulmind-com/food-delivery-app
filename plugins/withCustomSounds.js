const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withCustomSounds = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const resPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw');

      // Make sure raw directory exists
      if (!fs.existsSync(resPath)) {
        fs.mkdirSync(resPath, { recursive: true });
      }

      const soundsPath = path.join(projectRoot, 'assets', 'sounds');

      if (fs.existsSync(soundsPath)) {
        const soundFiles = fs.readdirSync(soundsPath);
        for (const file of soundFiles) {
          if (file.endsWith('.wav') || file.endsWith('.mp3')) {
            const src = path.join(soundsPath, file);
            const dest = path.join(resPath, file);
            fs.copyFileSync(src, dest);
            console.log(`[withCustomSoundsPlugin] Copied ${file} to Android native res/raw`);
          }
        }
      }

      return config;
    },
  ]);
};

module.exports = withCustomSounds;
