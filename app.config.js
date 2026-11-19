// Configuração dinâmica: estende o app.json com o que não pode ficar no repositório.
// A chave do Google Maps (Android) vem da variável GOOGLE_MAPS_ANDROID_KEY:
// - no build da nuvem: `eas env:create --name GOOGLE_MAPS_ANDROID_KEY --visibility secret`;
// - localmente (expo run:android): defina no .env.local, que não vai para o Git.
// Sem a chave o app continua abrindo; só o mapa nativo fica em branco no Android.
module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', androidGoogleMapsApiKey ? { androidGoogleMapsApiKey } : {}],
    ],
  };
};
