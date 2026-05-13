// Exemplo para usar no React Native/Expo depois
// Troque pelo IP da sua máquina na rede quando testar no celular físico.
// Exemplo: http://192.168.0.10:3001/api

const API_URL = "http://localhost:3001/api";

export async function loginAdmin(usuario: string, senha: string) {
  const resposta = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, senha }),
  });

  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.message || "Erro ao entrar");
  return dados;
}

export async function carregarEstadoPortal(token: string) {
  const resposta = await fetch(`${API_URL}/state`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.message || "Erro ao carregar dados");
  return dados;
}

export async function salvarEstadoPortal(token: string, estado: unknown) {
  const resposta = await fetch(`${API_URL}/state`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(estado),
  });

  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.message || "Erro ao salvar dados");
  return dados;
}
