// Padrão do repositório. Para testar localmente com outra URL, defina EXPO_PUBLIC_API_URL no arquivo .env.local
// (ex.: http://192.168.15.9:5000/TioDaPerua/api para usar no celular).
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/TioDaPerua/api';

export const REQUEST_TIMEOUT_MS = 10000;

/** Link permanente do PDF dos Termos de Uso e da Política de Privacidade (servido pelo backend, rota pública). */
export const TERMOS_PDF_URL = `${BASE_URL}/termos/termos-de-uso-e-privacidade.pdf`;
