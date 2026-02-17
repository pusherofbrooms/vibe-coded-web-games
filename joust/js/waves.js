(function initWavesModule() {
  function getWaveConfig(waveNumber) {
    const hasEggWave = waveNumber % 5 === 0;
    const bounder = Math.min(8, 2 + Math.floor((waveNumber - 1) / 2));
    const hunter = waveNumber >= 3 ? Math.min(6, 1 + Math.floor((waveNumber - 3) / 3)) : 0;
    const shadowLord = waveNumber >= 16 ? Math.min(3, 1 + Math.floor((waveNumber - 16) / 4)) : 0;
    const pterodactylScheduled = waveNumber >= 8 && (waveNumber - 8) % 5 === 0;

    return {
      waveNumber,
      hasEggWave,
      bounder,
      hunter,
      shadowLord,
      pterodactylScheduled,
    };
  }

  window.JoustWaves = {
    getWaveConfig,
  };
})();
