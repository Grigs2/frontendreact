// Extrai uma mensagem amigável de erros do axios.
// O backend novo responde com ErrorResponseDTO { status, error, message, path };
// endpoints antigos usam { mensagem } ou { erro }.

export const getApiErrorMessage = (error: any, fallback: string) => {
  if (!error?.response) {
    if (error?.message && !error?.isAxiosError) return error.message;
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }
  const data = error.response.data;
  const message = typeof data === 'string' ? data : data?.message || data?.mensagem || data?.erro;
  if (typeof message === 'string' && message.trim()) return message;
  if (error.response.status === 429) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  return fallback;
};

export const getApiStatus = (error: any): number | undefined => error?.response?.status;
