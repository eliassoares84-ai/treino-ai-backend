import { Router } from 'express';
import { gerarTreinoAI } from '../controllers/aiController.js';

const router = Router();

// POST /api/v1/ai/gerar-treino
router.post('/ai/gerar-treino', gerarTreinoAI);

export default router;
