// ============================================================================
// Mock API Routes para execução local sem banco de dados
// ============================================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const mockData = require('../mockData');

const { users, setores, macroprocessos, processos, indicadores, alerts, logs, atividades, generateId } = mockData;

const createToken = (usuario) => {
    return jwt.sign(
        {
            id: usuario.id,
            email: usuario.email,
            nome: usuario.nome,
            perfil: usuario.perfil,
            setor_id: usuario.setor_id
        },
        process.env.JWT_SECRET || 'local-mock-secret',
        { expiresIn: '24h' }
    );
};

const findUserByEmail = (email) => users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.ativo);

const findUserById = (id) => users.find(u => u.id === parseInt(id, 10));

const getSetorNome = (id) => {
    const setor = setores.find(s => s.id === id);
    return setor ? setor.nome : 'Sem setor';
};

const getMacroprocessoNome = (id) => {
    const macro = macroprocessos.find(m => m.id === id);
    return macro ? macro.nome : 'Sem macroprocesso';
};

const getResponsavelNome = (id) => {
    const usuario = users.find(u => u.id === id);
    return usuario ? usuario.nome : 'Não definido';
};

const enrichProcess = (processo) => {
    const procAtividades = (atividades || []).filter(a => a.processo_id === processo.id).map(a => ({
        id: a.id,
        fase: a.fase,
        descricao: a.descricao,
        concluido: !!a.concluido,
        responsavel_id: a.responsavel_id,
        responsavel_nome: getResponsavelNome(a.responsavel_id),
        criado_em: a.criado_em,
        attachments: (a.attachments || []).map(att => ({ id: att.id, filename: att.filename, url: att.url, criado_em: att.criado_em })),
        checklist: (a.checklist || []).map(item => ({ id: item.id, descricao: item.descricao, concluido: !!item.concluido }))
    }));

    return {
        ...processo,
        setor_nome: getSetorNome(processo.setor_id),
        macroprocesso_nome: getMacroprocessoNome(processo.macroprocesso_id),
        responsavel_nome: getResponsavelNome(processo.responsavel_id),
        atividades: procAtividades
    };
};

const appendLog = (usuarioId, acao, tabela, idRegistro) => {
    logs.push({
        id: generateId(logs),
        usuario_id: usuarioId,
        acao,
        tabela_afetada: tabela,
        id_registro: idRegistro,
        criado_em: new Date().toISOString()
    });
};

router.post('/auth/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const usuario = findUserByEmail(email);
    if (!usuario || usuario.senha !== senha) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    appendLog(usuario.id, 'Login realizado', 'usuarios', usuario.id);

    const token = createToken(usuario);
    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, setor_id: usuario.setor_id } });
});

router.get('/auth/perfil', verifyToken, (req, res) => {
    res.json(req.user);
});

router.post('/auth/registrar', verifyToken, requireAdmin, (req, res) => {
    const { nome, email, senha, perfil, setor_id } = req.body;

    if (!nome || !email || !senha || !perfil) {
        return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    if (!['NGE', 'SETOR'].includes(perfil)) {
        return res.status(400).json({ error: 'Perfil inválido' });
    }

    if (findUserByEmail(email)) {
        return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    const newUser = {
        id: generateId(users),
        nome,
        email,
        senha,
        perfil,
        setor_id: perfil === 'SETOR' ? parseInt(setor_id, 10) : null,
        ativo: true
    };

    users.push(newUser);
    appendLog(req.user.id, 'Usuário registrado', 'usuarios', newUser.id);

    res.status(201).json({
        id: newUser.id,
        nome: newUser.nome,
        email: newUser.email,
        perfil: newUser.perfil,
        setor_id: newUser.setor_id,
        setor_nome: getSetorNome(newUser.setor_id),
        ativo: newUser.ativo
    });
});

router.get('/auth/usuarios', verifyToken, requireAdmin, (req, res) => {
    const result = users.map(u => ({ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, setor_id: u.setor_id, setor_nome: getSetorNome(u.setor_id), ativo: u.ativo }));
    res.json(result);
});

router.get('/auth/usuarios/:id', verifyToken, (req, res) => {
    const usuario = findUserById(req.params.id);
    if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (req.user.id !== usuario.id && req.user.perfil !== 'NGE') {
        return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, setor_id: usuario.setor_id, ativo: usuario.ativo });
});

router.put('/auth/usuarios/:id', verifyToken, (req, res) => {
    const usuario = findUserById(req.params.id);
    if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (req.user.id !== usuario.id && req.user.perfil !== 'NGE') {
        return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    usuario.nome = req.body.nome || usuario.nome;
    usuario.email = req.body.email || usuario.email;
    usuario.perfil = req.body.perfil || usuario.perfil;
    usuario.setor_id = req.body.setor_id || usuario.setor_id;
    usuario.ativo = req.body.ativo !== undefined ? req.body.ativo : usuario.ativo;

    res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, setor_id: usuario.setor_id, ativo: usuario.ativo });
});

router.post('/auth/alterar-senha', verifyToken, (req, res) => {
    const { senhaAtual, novaSenha } = req.body;
    const usuario = findUserById(req.user.id);

    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    if (!usuario || usuario.senha !== senhaAtual) {
        return res.status(401).json({ error: 'Senha atual inválida' });
    }

    usuario.senha = novaSenha;
    res.json({ mensagem: 'Senha alterada com sucesso' });
});

router.get('/processes', verifyToken, (req, res) => {
    const { setor_id, status_fase } = req.query;
    let resultado = [...processos];

    if (req.user.perfil === 'SETOR') {
        resultado = resultado.filter(p => p.setor_id === req.user.setor_id);
    } else if (setor_id) {
        resultado = resultado.filter(p => p.setor_id === parseInt(setor_id, 10));
    }

    if (status_fase) {
        resultado = resultado.filter(p => p.status_fase === status_fase);
    }

    res.json(resultado.map(enrichProcess));
});

router.get('/processes/estatisticas/geral', verifyToken, (req, res) => {
    const { setor_id } = req.query;
    let items = [...processos];

    if (req.user.perfil === 'SETOR') {
        items = items.filter(p => p.setor_id === req.user.setor_id);
    } else if (setor_id) {
        items = items.filter(p => p.setor_id === parseInt(setor_id, 10));
    }

    const porStatus = items.reduce((acc, item) => {
        acc[item.status_fase] = (acc[item.status_fase] || 0) + 1;
        return acc;
    }, {});

    const matchingIndicators = indicadores.filter(ind => items.some(p => p.id === ind.processo_id));
    const conformidade = matchingIndicators.reduce((sum, ind) => sum + (ind.valor_meta > 0 ? (ind.valor_atual / ind.valor_meta) * 100 : 0), 0);
    const media = matchingIndicators.length ? Math.round(conformidade / matchingIndicators.length) : 0;

    res.json({ processos: { porStatus, total: items.length }, indicadores: { conformidadeMedia: media }, dataGeracao: new Date().toISOString() });
});

router.get('/processes/:id', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    res.json(enrichProcess(processo));
});

// Atividades relacionadas a um processo
router.get('/processes/:id/activities', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const { fase } = req.query;
    let resultado = (atividades || []).filter(a => a.processo_id === processo.id);
    if (fase) resultado = resultado.filter(a => a.fase === fase);
    const mapped = resultado.map(a => ({ ...a, responsavel_nome: getResponsavelNome(a.responsavel_id) }));
    res.json({ atividades: mapped });
});

router.post('/processes/:id/activities', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const { fase, descricao, responsavel_id } = req.body;
    if (!fase || !descricao) return res.status(400).json({ error: 'fase e descricao são obrigatórios' });

    const novo = {
        id: generateId(atividades),
        processo_id: processo.id,
        fase,
        descricao,
        concluido: false,
        responsavel_id: responsavel_id ? parseInt(responsavel_id, 10) : req.user.id,
        criado_em: new Date().toISOString()
    };

    atividades.push(novo);
    appendLog(req.user.id, 'Atividade criada', 'atividades', novo.id);
    res.status(201).json({ ...novo, responsavel_nome: getResponsavelNome(novo.responsavel_id) });
});

router.put('/processes/:id/activities/:aid', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const atividade = atividades.find(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    atividade.descricao = req.body.descricao || atividade.descricao;
    if (req.body.concluido !== undefined) atividade.concluido = !!req.body.concluido;
    if (req.body.responsavel_id) atividade.responsavel_id = parseInt(req.body.responsavel_id, 10);

    appendLog(req.user.id, 'Atividade atualizada', 'atividades', atividade.id);
    res.json({ ...atividade, responsavel_nome: getResponsavelNome(atividade.responsavel_id), attachments: (atividade.attachments||[]), checklist: atividade.checklist || [] });
});

// Checklist endpoints
router.put('/processes/:id/activities/:aid/checklist/:cid', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const atividade = atividades.find(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    atividade.checklist = atividade.checklist || [];
    const item = atividade.checklist.find(i => i.id === parseInt(req.params.cid, 10));
    if (!item) return res.status(404).json({ error: 'Item de checklist não encontrado' });

    if (req.body.concluido !== undefined) item.concluido = !!req.body.concluido;
    if (req.body.descricao) item.descricao = req.body.descricao;

    appendLog(req.user.id, 'Checklist atualizado', 'atividades_checklist', item.id);
    res.json(item);
});

router.post('/processes/:id/activities/:aid/checklist', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const atividade = atividades.find(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    const { descricao } = req.body;
    if (!descricao) return res.status(400).json({ error: 'descricao é obrigatória' });

    atividade.checklist = atividade.checklist || [];
    const novoItem = { id: generateId(atividade.checklist), descricao, concluido: false };
    atividade.checklist.push(novoItem);
    appendLog(req.user.id, 'Checklist criado', 'atividades_checklist', novoItem.id);
    res.status(201).json(novoItem);
});

// Attachments endpoints
router.post('/processes/:id/activities/:aid/attachments', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const atividade = atividades.find(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    const { filename, url } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename é obrigatório' });

    atividade.attachments = atividade.attachments || [];
    const novo = { id: generateId(atividade.attachments), filename, url: url || null, criado_em: new Date().toISOString(), usuario_id: req.user.id };
    atividade.attachments.push(novo);
    appendLog(req.user.id, 'Anexo criado', 'atividades_anexos', novo.id);
    res.status(201).json(novo);
});

router.delete('/processes/:id/activities/:aid/attachments/:anid', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const atividade = atividades.find(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    atividade.attachments = atividade.attachments || [];
    const idx = atividade.attachments.findIndex(at => at.id === parseInt(req.params.anid, 10));
    if (idx === -1) return res.status(404).json({ error: 'Anexo não encontrado' });

    const rem = atividade.attachments.splice(idx, 1)[0];
    appendLog(req.user.id, 'Anexo removido', 'atividades_anexos', rem.id);
    res.json({ mensagem: 'Anexo removido' });
});

router.delete('/processes/:id/activities/:aid', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) return res.status(403).json({ error: 'Acesso não autorizado ao processo' });

    const idx = atividades.findIndex(a => a.id === parseInt(req.params.aid, 10) && a.processo_id === processo.id);
    if (idx === -1) return res.status(404).json({ error: 'Atividade não encontrada' });

    const rem = atividades.splice(idx, 1)[0];
    appendLog(req.user.id, 'Atividade removida', 'atividades', rem.id);
    res.json({ mensagem: 'Atividade removida' });
});

router.post('/processes', verifyToken, (req, res) => {
    const setorId = req.user.perfil === 'SETOR' ? req.user.setor_id : parseInt(req.body.setor_id, 10) || 1;
    const novo = {
        id: generateId(processos),
        nome: req.body.nome || 'Novo processo',
        setor_id: setorId,
        macroprocesso_id: parseInt(req.body.macroprocesso_id, 10) || 1,
        status_fase: 'Planejar',
        percentual_conclusao: 0,
        responsavel_id: req.user.id,
        data_inicio: req.body.data_inicio || new Date().toISOString().split('T')[0],
        data_fim: req.body.data_fim || null,
        observacoes: req.body.observacoes || '',
        criado_em: new Date().toISOString()
    };

    processos.push(novo);
    appendLog(req.user.id, 'Processo criado', 'processos', novo.id);
    res.status(201).json(enrichProcess(novo));
});

router.put('/processes/:id', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    processo.nome = req.body.nome || processo.nome;
    processo.setor_id = req.user.perfil === 'SETOR' ? processo.setor_id : (req.body.setor_id ? parseInt(req.body.setor_id, 10) : processo.setor_id);
    processo.macroprocesso_id = req.body.macroprocesso_id ? parseInt(req.body.macroprocesso_id, 10) : processo.macroprocesso_id;
    processo.status_fase = req.body.status_fase || processo.status_fase;
    processo.percentual_conclusao = req.body.percentual_conclusao !== undefined ? parseInt(req.body.percentual_conclusao, 10) : processo.percentual_conclusao;
    processo.observacoes = req.body.observacoes || processo.observacoes;
    processo.data_fim = req.body.data_fim || processo.data_fim;

    appendLog(req.user.id, 'Processo atualizado', 'processos', processo.id);
    res.json(enrichProcess(processo));
});

router.delete('/processes/:id', verifyToken, requireAdmin, (req, res) => {
    const index = processos.findIndex(p => p.id === parseInt(req.params.id, 10));
    if (index === -1) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }
    processos.splice(index, 1);
    appendLog(req.user.id, 'Processo removido', 'processos', parseInt(req.params.id, 10));
    res.json({ mensagem: 'Processo removido com sucesso' });
});

router.get('/processes/:id/indicadores', verifyToken, (req, res) => {
    const processo = processos.find(p => p.id === parseInt(req.params.id, 10));
    if (!processo) {
        return res.status(404).json({ error: 'Processo não encontrado' });
    }

    if (req.user.perfil === 'SETOR' && processo.setor_id !== req.user.setor_id) {
        return res.status(403).json({ error: 'Acesso não autorizado ao processo' });
    }

    const resultado = indicadores.filter(i => i.processo_id === processo.id);
    res.json(resultado);
});

router.get('/indicators', verifyToken, (req, res) => {
    if (req.user.perfil === 'SETOR') {
        const setorId = req.user.setor_id;
        const processosDoSetor = processos.filter(p => p.setor_id === setorId).map(p => p.id);
        const resultado = indicadores.filter(i => processosDoSetor.includes(i.processo_id));
        return res.json(resultado);
    }

    res.json(indicadores);
});

router.get('/indicators/:id', verifyToken, (req, res) => {
    const indicador = indicadores.find(i => i.id === parseInt(req.params.id, 10));
    if (!indicador) {
        return res.status(404).json({ error: 'Indicador não encontrado' });
    }

    if (req.user.perfil === 'SETOR') {
        const processo = processos.find(p => p.id === indicador.processo_id);
        if (processo && processo.setor_id !== req.user.setor_id) {
            return res.status(403).json({ error: 'Acesso não autorizado ao indicador' });
        }
    }

    res.json(indicador);
});

router.put('/indicators/:id/valor', verifyToken, (req, res) => {
    const indicador = indicadores.find(i => i.id === parseInt(req.params.id, 10));
    if (!indicador) {
        return res.status(404).json({ error: 'Indicador não encontrado' });
    }

    if (req.body.novoValor === undefined) {
        return res.status(400).json({ error: 'novoValor é obrigatório' });
    }

    if (req.user.perfil === 'SETOR') {
        const processo = processos.find(p => p.id === indicador.processo_id);
        if (processo && processo.setor_id !== req.user.setor_id) {
            return res.status(403).json({ error: 'Acesso não autorizado ao indicador' });
        }
    }

    indicador.valor_atual = parseFloat(req.body.novoValor);
    indicador.atualizado_em = new Date().toISOString();
    appendLog(req.user.id, 'Indicador atualizado', 'indicadores', indicador.id);
    res.json(indicador);
});

router.get('/indicators/setor/:setorId', verifyToken, (req, res) => {
    const setorId = parseInt(req.params.setorId, 10);
    if (req.user.perfil === 'SETOR' && req.user.setor_id !== setorId) {
        return res.status(403).json({ error: 'Acesso restrito ao setor' });
    }

    const processosDoSetor = processos.filter(p => p.setor_id === setorId).map(p => p.id);
    const resultado = indicadores.filter(i => processosDoSetor.includes(i.processo_id));
    res.json(resultado);
});

router.get('/reports/processos', verifyToken, (req, res) => {
    let dados = [...processos];
    if (req.user.perfil === 'SETOR') {
        dados = dados.filter(p => p.setor_id === req.user.setor_id);
    }
    res.json({ dados: dados.map(enrichProcess), resumo: { total: dados.length }, dataGeracao: new Date().toISOString() });
});

router.get('/reports/indicadores', verifyToken, (req, res) => {
    let resultado = [...indicadores];
    if (req.user.perfil === 'SETOR') {
        const processosDoSetor = processos.filter(p => p.setor_id === req.user.setor_id).map(p => p.id);
        resultado = resultado.filter(i => processosDoSetor.includes(i.processo_id));
    }
    res.json({ dados: resultado, resumo: { total: resultado.length }, dataGeracao: new Date().toISOString() });
});

router.get('/reports/dashboard', verifyToken, (req, res) => {
    let items = [...processos];

    if (req.user.perfil === 'SETOR') {
        items = items.filter(p => p.setor_id === req.user.setor_id);
    }

    const porStatus = items.reduce((acc, processo) => {
        acc[processo.status_fase] = (acc[processo.status_fase] || 0) + 1;
        return acc;
    }, {});

    const total = items.length;
    const matchingIndicators = indicadores.filter(ind => items.some(p => p.id === ind.processo_id));
    const conformidadeMedia = matchingIndicators.length
        ? Math.round(matchingIndicators.reduce((sum, indicador) => sum + (indicador.valor_meta > 0 ? (indicador.valor_atual / indicador.valor_meta) * 100 : 0), 0) / matchingIndicators.length)
        : 0;

    res.json({ processos: { porStatus, total }, indicadores: { conformidadeMedia }, dataGeracao: new Date().toISOString() });
});

router.get('/reports/logs', verifyToken, (req, res) => {
    const resultado = req.user.perfil === 'SETOR'
        ? logs.filter(log => log.usuario_id === req.user.id)
        : logs;
    res.json({ logs: resultado, total: resultado.length, dataGeracao: new Date().toISOString() });
});

module.exports = router;

module.exports = router;
