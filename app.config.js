// Configuração dinâmica: estende o app.json com o que não pode ficar no repositório.
// A chave do Google Maps (Android) vem da variável GOOGLE_MAPS_ANDROID_KEY:
// - no build da nuvem: `eas env:create --name GOOGLE_MAPS_ANDROID_KEY --visibility secret`;
// - localmente (expo run:android): defina no .env.local, que não vai para o Git.
// Sem a chave o app continua abrindo; só o mapa nativo fica em branco no Android.
// O google-services.json (Firebase) também não vai para o Git: no EAS entra como variável de arquivo
// GOOGLE_SERVICES_JSON (ver docs/BUILD_ANDROID_PREVIEW.md); localmente usa ./google-services.json.
module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', androidGoogleMapsApiKey ? { androidGoogleMapsApiKey } : {}],
    ],
  };
};
