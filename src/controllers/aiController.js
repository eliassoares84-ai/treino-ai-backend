import OpenAI from 'openai';

const SYSTEM_PERSONA = `Atue como um Educador Fisico Senior e Personal Trainer de Elite.

Sua persona:
- Voce tem mais de 20 anos de experiencia em fisiologia do exercicio, biomecanica e treinamento desportivo.
- Ja treinou desde atletas de alto rendimento ate iniciantes sedentarios e pessoas com limitacoes fisicas.
- Sua abordagem e baseada em ciencia, seguranca, hipertrofia estruturada, biomecanica eficiente e resultados sustentaveis.
- Seu tom e profissional, encorajador, tecnico e claro. Voce motiva, mas nao promete milagres.

Seus objetivos:
- Criar planos de treino periodizados e personalizados, com foco profundo na divisao logica de grupos musculares.
- Oferecer suporte tecnico sobre execucao correta para otimizar recrutamento muscular e reduzir risco de lesao.
- Ajustar treinos com base em fadiga, recuperacao, volume, intensidade e sobrecarga progressiva.

Diretrizes obrigatorias de divisao muscular:
- Sempre organize o treino por fichas com logica biomecanica e de recuperacao.
- Quando a frequencia semanal permitir, seja capaz de estruturar pelo menos 5 fichas distintas (ABCDE).
- Membros inferiores devem ser divididos em pelo menos duas fichas distintas quando houver volume semanal suficiente:
  - uma com foco em quadriceps e panturrilhas (cadeia anterior)
  - outra com foco em gluteos e isquiotibiais/posteriores (cadeia posterior)
- Costas devem ser combinadas preferencialmente com biceps e antebracos, respeitando a sinergia de puxadas.
- Peitoral deve ser combinado preferencialmente com triceps e/ou ombros, respeitando a sinergia de empurrar.
- Evite overtraining de musculos auxiliares e garanta tempo de recuperacao entre sessoes.

Regras de qualidade da prescricao:
- Nao entregue ficha simplista, generica ou repetitiva.
- Nao concentre o plano inteiro em uma unica ficha se a frequencia semanal permitir mais divisao.
- Distribua volume, grupamentos e dificuldade de forma compativel com o nivel do aluno.
- Explique implicitamente essa logica na propria estrutura do plano, mesmo retornando apenas JSON.
- Considere lesoes, restricoes, equipamentos, local e tempo disponivel antes de selecionar exercicios.
- Nao faca diagnostico medico.
- Nao faca promessas irreais de resultado.

Formato da resposta:
- Retorne APENAS um objeto JSON valido, sem markdown, sem comentarios e sem texto adicional.
- Siga estritamente o schema solicitado pelo usuario.
- Estruture o plano como um profissional senior, com divisao de blocos coerente com AB, ABC, ABCD ou ABCDE conforme dias disponiveis.`;

const INJURY_GUARD_RULES = [
  {
    region: 'ombro',
    triggers: ['ombro', 'manguito', 'supraespinhal', 'infraespinhal', 'labrum', 'tendinite no ombro'],
    riskyKeywords: ['desenvolvimento', 'militar', 'elevacao lateral', 'elevacao frontal', 'supino', 'paralela', 'crucifixo', 'crossover', 'arnold press', 'flexao de braco', 'flexão de braço'],
    replacement: { nome: 'Remada Baixa na Polia (leve)', exercicioId: 'ex-remada-baixa-polia-leve' },
  },
  {
    region: 'cotovelo-punho',
    triggers: ['cotovelo', 'epicondilite', 'punho', 'tunel do carpo', 'túnel do carpo'],
    riskyKeywords: ['rosca', 'triceps', 'tríceps', 'barra fixa', 'pulldown', 'supino fechado', 'wrist curl'],
    replacement: { nome: 'Remada Sentada com Pegada Neutra (leve)', exercicioId: 'ex-remada-sentada-neutra-leve' },
  },
  {
    region: 'coluna-lombar',
    triggers: ['lombar', 'coluna', 'hernia', 'hérnia', 'ciatico', 'ciático', 'escoliose', 'espondilolistese'],
    riskyKeywords: ['levantamento terra', 'terra', 'stiff', 'good morning', 'agachamento', 'remada curvada', 'abdominal completo'],
    replacement: { nome: 'Leg Press 45° (amplitude controlada)', exercicioId: 'ex-leg-press-amplitude-controlada' },
  },
  {
    region: 'joelho',
    triggers: ['joelho', 'patela', 'patelar', 'menisco', 'lca', 'lcp', 'condromalacia'],
    riskyKeywords: ['agachamento', 'afundo', 'passada', 'avanco', 'avanço', 'lunge', 'salto', 'pliometr', 'leg extension', 'cadeira extensora pesada'],
    replacement: { nome: 'Cadeira Extensora Isométrica (leve)', exercicioId: 'ex-cadeira-extensora-isometrica-leve' },
  },
  {
    region: 'tornozelo-pe',
    triggers: ['tornozelo', 'pe', 'pé', 'fasciite', 'fascite', 'aquiles', 'entorse'],
    riskyKeywords: ['corrida', 'saltos', 'pliometr', 'corda', 'sprint', 'burpee'],
    replacement: { nome: 'Bicicleta Ergométrica (leve)', exercicioId: 'ex-bicicleta-ergometrica-leve' },
  },
  {
    region: 'quadril',
    triggers: ['quadril', 'sacroiliaca', 'sacroilíaca', 'impacto femoroacetabular', 'labral do quadril'],
    riskyKeywords: ['agachamento profundo', 'leg press profundo', 'afundo', 'sumo', 'stiff'],
    replacement: { nome: 'Ponte de Glúteo no Solo (controlado)', exercicioId: 'ex-ponte-gluteo-controlado' },
  },
  {
    region: 'cervical',
    triggers: ['cervical', 'pescoco', 'pescoço', 'torcicolo', 'cervicobraquial'],
    riskyKeywords: ['desenvolvimento', 'encolhimento', 'levantamento olimpico', 'levantamento olímpico', 'high pull'],
    replacement: { nome: 'Face Pull com Elástico (leve)', exercicioId: 'ex-face-pull-elastico-leve' },
  },
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasNoReportedInjury(lesoes) {
  const text = normalizeText(lesoes);
  if (!text) return true;
  return ['nenhuma', 'nenhum', 'sem lesao', 'sem lesoes', 'nao tenho lesao', 'não tenho lesão', 'nao informado'].some((token) => text.includes(token));
}

function buildActiveInjuryRules(lesoes) {
  const text = normalizeText(lesoes);
  return INJURY_GUARD_RULES.filter((rule) =>
    rule.triggers.some((trigger) => text.includes(normalizeText(trigger)))
  );
}

function applyInjurySafetyLayer(exercicios, lesoes) {
  if (hasNoReportedInjury(lesoes)) return exercicios;

  const activeRules = buildActiveInjuryRules(lesoes);
  if (!activeRules.length) return exercicios;

  return exercicios.map((exercicio) => {
    const haystack = `${normalizeText(exercicio.nome)} ${normalizeText(exercicio.exercicioId)}`;
    const matchedRules = activeRules.filter((rule) =>
      rule.riskyKeywords.some((keyword) => haystack.includes(normalizeText(keyword)))
    );

    if (!matchedRules.length) return exercicio;

    const primaryRule = matchedRules[0];
    const reducedLoad = Math.max(0, Math.round((Number(exercicio.cargaPropostaKg) || 0) * 0.6));

    return {
      ...exercicio,
      nome: primaryRule.replacement.nome,
      exercicioId: primaryRule.replacement.exercicioId,
      cargaPropostaKg: reducedLoad,
      adaptacaoTipo: `Substituído por segurança (${matchedRules.map((rule) => rule.region).join(', ')})`,
    };
  });
}

function formatRecentPlansContext(historicoTreinosRecentes) {
  if (!Array.isArray(historicoTreinosRecentes) || historicoTreinosRecentes.length === 0) {
    return 'Nenhum histórico recente informado.';
  }

  return historicoTreinosRecentes
    .slice(0, 5)
    .map((plano, index) => {
      const nome = plano?.nome || `Plano ${index + 1}`;
      const objetivo = plano?.objetivo || 'não informado';
      const dias = plano?.diasDisponiveis || 'n/i';
      const nivel = plano?.nivel || 'n/i';
      const exercicios = Array.isArray(plano?.exercicios) && plano.exercicios.length
        ? plano.exercicios.slice(0, 8).join(', ')
        : 'não informado';

      return `${index + 1}) ${nome} | objetivo: ${objetivo} | dias: ${dias} | nível: ${nivel} | exercícios: ${exercicios}`;
    })
    .join('\n');
}

// Retorna quantos blocos distintos são obrigatórios para os dias informados
function getMinBlocks(dias) {
  const d = Number(dias) || 1;
  if (d >= 5) return 5;
  if (d === 4) return 4;
  if (d === 3) return 3;
  return 2; // 1-2 dias => AB
}

// Monta a string de instrução explícita de divisão para o prompt de retry
function buildBlockRequirementText(dias) {
  const d = Number(dias) || 1;
  if (d >= 5) return `OBRIGATORIO: O plano DEVE conter exatamente 5 blocos DISTINTOS: A, B, C, D e E. Cada exercicio DEVE ter seu campo blocoTreino preenchido com apenas UMA dessas letras. A = Peito + Triceps. B = Costas + Biceps. C = Ombros + Core. D = Inferiores Quadriceps + Panturrilhas. E = Inferiores Posterior Gluteos + Isquiotibiais.`;
  if (d === 4) return `OBRIGATORIO: O plano DEVE conter exatamente 4 blocos DISTINTOS: A, B, C e D. Cada exercicio DEVE ter seu campo blocoTreino preenchido com apenas UMA dessas letras. A = Peito + Triceps. B = Costas + Biceps. C = Ombros + Core. D = Inferiores completo Quadriceps Gluteos Isquiotibiais.`;
  if (d === 3) return `OBRIGATORIO: O plano DEVE conter exatamente 3 blocos DISTINTOS: A, B e C. A = Superiores Empurrar. B = Superiores Puxar. C = Inferiores.`;
  return `OBRIGATORIO: O plano DEVE conter exatamente 2 blocos DISTINTOS: A e B.`;
}

// Fallback: redistribui exercícios existentes em N blocos ordenados se a IA falhar
function redistributeBlocks(exercicios, dias) {
  const d = Number(dias) || 1;
  const blockLabels = d >= 5 ? ['A','B','C','D','E'] : d === 4 ? ['A','B','C','D'] : d === 3 ? ['A','B','C'] : ['A','B'];
  const perBlock = Math.ceil(exercicios.length / blockLabels.length);
  return exercicios.map((ex, i) => ({
    ...ex,
    blocoTreino: blockLabels[Math.floor(i / perBlock)] || blockLabels[blockLabels.length - 1],
  }));
}

export async function gerarTreinoAI(req, res) {
  try {
    const body = req.body || {};
    const {
      objetivo,
      diasDisponiveis,
      lesoes = '',
      nivel = 'intermediario',
      meta = 'não informada',
      idade = 'não informada',
      sexo = 'não informado',
      pesoKg = 'não informado',
      alturaCm = 'não informado',
      tempoTreinoMin = 'não informado',
      localTreino = 'não informado',
      equipamentos = 'não informado',
      restricoes = 'nenhuma informada',
      preferencias = 'não informadas',
      exerciciosEvitar = 'nenhum informado',
      historicoTreinosRecentes = [],
    } = body;

    const contextoHistorico = formatRecentPlansContext(historicoTreinosRecentes);

    if (!objetivo || !diasDisponiveis) {
      return res.status(400).json({ error: 'Campos obrigatórios: objetivo, diasDisponiveis' });
    }

    const minBlocks = getMinBlocks(diasDisponiveis);
    const blockRequirementText = buildBlockRequirementText(diasDisponiveis);

    const prompt = `Com base nos dados do usuario abaixo, gere um plano de treino estruturado. 
${blockRequirementText}
ATENÇÃO: Você deve retornar um objeto JSON perfeito seguindo EXATAMENTE este schema:
{
  "nome": "string (ex: Plano Hipertrofia ABCD)",
  "estruturaExercicios": [
    {
      "blocoTreino": "string (A, B, C, D, ou E)",
      "nome": "string",
      "exercicioId": "string (ex: ex-supino-reto)",
      "series": 3,
      "repeticoes": 12,
      "cargaPropostaKg": 0,
      "descansoSegundos": 90,
      "adaptacaoTipo": "Normal"
    }
  ]
}

Regras específicas para este usuário:
- Objetivo: ${objetivo}
- Meta especifica: ${meta}
- Dias disponiveis por semana: ${diasDisponiveis}
- Tempo por treino (min): ${tempoTreinoMin}
- Lesoes/Restricoes: ${lesoes}
- Restricoes adicionais: ${restricoes}
- Nivel: ${nivel}
- Idade: ${idade} | Sexo: ${sexo} | Peso (kg): ${pesoKg} | Altura (cm): ${alturaCm}
- Local de treino: ${localTreino}
- Equipamentos disponiveis: ${equipamentos}
- Preferencias do usuario: ${preferencias}
- Exercicios que deve evitar: ${exerciciosEvitar}

Historico dos ultimos treinos gerados:
${contextoHistorico}

Diretrizes de Estruturação:
- Defina descansoSegundos entre 30 e 180 (maior para compostos/pesados, menor para isolados).
- Monte a divisao por blocos de treino (A, B, C, D, E) correspondente aos ${diasDisponiveis} dias disponiveis.
- Priorize a divisão ABCDE se houver 5 dias ou mais, separando pernas em duas fichas distintas e distribuindo bem membros superiores.
- Preencha o campo blocoTreino apenas com letras (A, B, C, D, E).
- Use IDs estaveis em kebab-case em "exercicioId" (ex: ex-agachamento-livre).
- Adapte a quantidade de exercicios ao tempo disponivel (${tempoTreinoMin} min).
- O objeto raiz deve conter as propriedades "nome" e "estruturaExercicios".`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada' });
    }

    const client = new OpenAI({ apiKey });

    const callAI = async (messages) => {
      const r = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages,
        temperature: 0.4,
      });
      const raw = r.choices?.[0]?.message?.content?.trim() || '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      return JSON.parse(cleaned);
    };

    const baseMessages = [
      { role: 'system', content: SYSTEM_PERSONA },
      { role: 'user', content: prompt },
    ];

    let plano;
    // Tentativa 1: prompt normal
    try {
      plano = await callAI(baseMessages);
    } catch (e) {
      console.error('Tentativa 1 falhou:', e.message);
      return res.status(500).json({ error: 'A resposta gerada não é um JSON válido' });
    }

    if (!plano?.estruturaExercicios || !Array.isArray(plano.estruturaExercicios)) {
      return res.status(500).json({ error: 'Estrutura de treino gerada está inválida ou fora do schema' });
    }

    // Validação: conta blocos distintos
    const blocksReturned = new Set(plano.estruturaExercicios.map(e => String(e.blocoTreino || 'A').toUpperCase().charAt(0))).size;
    console.log(`Blocos retornados: ${blocksReturned} | Mínimo esperado: ${minBlocks}`);

    if (blocksReturned < minBlocks) {
      console.warn(`Blocos insuficientes (${blocksReturned}/${minBlocks}). Tentativa 2 com prompt mais rígido...`);
      const retryPrompt = `${blockRequirementText}

VOCÊ RETORNOU APENAS ${blocksReturned} BLOCO(S). ISSO ESTÁ ERRADO.
O aluno tem ${diasDisponiveis} dias disponíveis. É OBRIGATÓRIO gerar ${minBlocks} blocos DISTINTOS.
Cada bloco deve ter no mínimo 4 exercícios diferentes.
NÃO agrupe todos os exercícios em um único bloco.
Retorne o JSON completo corrigido agora.`;
      try {
        plano = await callAI([
          ...baseMessages,
          { role: 'assistant', content: JSON.stringify(plano) },
          { role: 'user', content: retryPrompt },
        ]);
      } catch (e) {
        console.error('Tentativa 2 falhou:', e.message);
        // Continua com o plano da tentativa 1, aplica fallback abaixo
      }
    }

    // Normalização Final
    // Fallback: se ainda vier com blocos insuficientes, redistribui forçadamente
    const blocksAfterRetry = new Set((plano.estruturaExercicios || []).map(e => String(e.blocoTreino || 'A').toUpperCase().charAt(0))).size;
    if (blocksAfterRetry < minBlocks) {
      console.warn(`Aplicando fallback de redistribuição (${blocksAfterRetry} -> ${minBlocks} blocos)`);
      plano.estruturaExercicios = redistributeBlocks(plano.estruturaExercicios, diasDisponiveis);
    }

    const mapped = {
      planoId: `ai-${Date.now()}`,
      nome: plano.nome || `Plano AI - ${objetivo}`,
      estruturaExercicios: plano.estruturaExercicios.map((ex) => ({
        blocoTreino: String(ex.blocoTreino || 'A').toUpperCase().charAt(0), // Garante apenas 1 letra
        nome: ex.nome || 'Exercício não especificado',
        exercicioId: ex.exercicioId || `ex-generico-${Math.floor(Math.random() * 1000)}`,
        series: Number(ex.series) || 3,
        repeticoes: Number(ex.repeticoes) || 12,
        cargaPropostaKg: Number(ex.cargaPropostaKg) || 0,
        descansoSegundos: Math.min(180, Math.max(30, Number(ex.descansoSegundos) || 90)),
        adaptacaoTipo: ex.adaptacaoTipo || 'Normal',
      })),
    };

    // Aplica a regra de segurança anti-lesão final (interceptador)
    mapped.estruturaExercicios = applyInjurySafetyLayer(mapped.estruturaExercicios, lesoes);

    return res.json({ plano: mapped });

  } catch (err) {
    console.error('AI gerarTreino erro:', err);
    return res.status(500).json({ error: 'Falha ao processar a requisição de treino via IA' });
  }
}