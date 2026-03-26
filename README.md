# Treino AI Backend

Pequeno servidor Express dedicado à geração de planos de treino via OpenAI, separado do backend principal.

## Rodar local

1. Crie `.env` com:
```
OPENAI_API_KEY=sk-...
PORT=4000
```
2. Instale deps:
```
npm install
```
3. Rode:
```
npm run dev
```

## Endpoints
- POST `/api/v1/ai/gerar-treino`
  - body:
    ```json
    {
      "objetivo": "hipertrofia",
      "diasDisponiveis": 4,
      "lesoes": "ombro",
      "nivel": "intermediario"
    }
    ```
  - retorno:
    ```json
    {
      "plano": {
        "planoId": "ai-...",
        "nome": "Plano AI - Hipertrofia",
        "estruturaExercicios": [
          {"nome": "Supino Reto", "exercicioId": "ex-supino-reto", "series": 4, "repeticoes": 8, "cargaPropostaKg": 60, "adaptacaoTipo": "Aumento Sobrecarga"}
        ]
      }
    }
    ```

## Deploy (Railway)

### 1. Criar novo projeto no Railway
```bash
# Instale Railway CLI (se ainda não tiver)
npm install -g @railway/cli

# Faça login
railway login

# No diretório treino-ai-backend, inicie novo projeto
railway init
```

### 2. Configure variáveis de ambiente
No dashboard do Railway, adicione:
- `OPENAI_API_KEY`: Sua chave da OpenAI (obrigatório)
- `PORT`: Automático (Railway define)

### 3. Deploy
```bash
# Commit suas mudanças
git add .
git commit -m "Setup treino AI backend"

# Deploy para Railway
railway up
```

### 4. Obtenha a URL do serviço
Após o deploy, copie a URL gerada (ex: `https://treino-ai-backend-production.up.railway.app`)

### 5. Configure no frontend
Atualize o arquivo `projeto-fitness-frontend/scr/config/backend.ts`:
```typescript
export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || "https://seu-servico.up.railway.app/api/v1";
```

Ou defina a variável de ambiente `EXPO_PUBLIC_BASE_URL` no Expo.

