#!/usr/bin/env node

/**
 * Script de teste para o endpoint de geração de treino com IA
 * Uso: node test-ai-endpoint.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

async function testarGeracao() {
  console.log('🧪 Testando geração de treino via IA...\n');

  const payload = {
    objetivo: 'hipertrofia',
    diasDisponiveis: 4,
    lesoes: 'dor no ombro direito',
    nivel: 'intermediario',
  };

  console.log('📤 Enviando payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n🔗 URL:', `${BASE_URL}/api/v1/ai/gerar-treino`);
  console.log('');

  try {
    const response = await fetch(`${BASE_URL}/api/v1/ai/gerar-treino`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro na resposta:', error);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Plano gerado com sucesso!\n');
    console.log('📋 Resultado:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log(`📊 Resumo:`);
    console.log(`   - Nome: ${data.plano.nome}`);
    console.log(`   - Total de exercícios: ${data.plano.estruturaExercicios.length}`);
    console.log(`   - Exercícios:`);
    data.plano.estruturaExercicios.forEach((ex, i) => {
      console.log(`     ${i + 1}. ${ex.nome} - ${ex.series}x${ex.repeticoes} (${ex.cargaPropostaKg}kg)`);
    });
    console.log('');
    console.log('🎉 Teste concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar teste:', error.message);
    process.exit(1);
  }
}

testarGeracao();
