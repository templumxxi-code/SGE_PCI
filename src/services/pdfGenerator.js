const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
    static get THEME() {
        return {
            institution: 'Polícia Científica do Rio Grande do Norte',
            system: 'SGE PCI/RN',
            government: 'Governo do Rio Grande do Norte',
            department: 'Secretaria de Segurança Pública e da Defesa Social',
            primary: '#0B57B7',
            section: '#C9D9F2',
            border: '#666666',
            text: '#111111',
            muted: '#5F6770',
            zebra: '#F4F6F8',
            white: '#FFFFFF'
        };
    }

    static gerarRelatarioProcessos(processos = [], resumo = {}, filtros = {}, contexto = {}) {
        return this.generate('RELATÓRIO DE PROCESSOS', filtros, contexto, doc => {
            this.section(doc, 'RESUMO EXECUTIVO');
            this.metrics(doc, [
                ['Total de Processos', resumo.total ?? processos.length],
                ['Processos em andamento', this.countStatuses(processos, ['Planejar', 'Analisar', 'Desenhar', 'Implementar', 'Monitorar'])],
                ['Homologados', this.countStatuses(processos, ['Homologado', 'Homologados'])],
                ['Conformidade média', `${this.number(resumo.percentualMedioConformidade)}%`]
            ]);
            this.section(doc, 'DISTRIBUIÇÃO POR FASE BPM');
            this.table(doc, ['Fase', 'Quantidade de Processos', 'Conformidade Média'], ['Planejar', 'Analisar', 'Desenhar', 'Implementar', 'Monitorar'].map(fase => {
                const rows = processos.filter(item => item.status_fase === fase);
                return [fase, rows.length, `${this.number(this.average(rows.map(item => item.percentual_conclusao)))}%`];
            }));
            this.section(doc, 'DETALHAMENTO DOS PROCESSOS');
            this.table(doc, ['Processo', 'Unidade/Núcleo', 'Setor', 'Fase Atual', 'Conformidade', 'Responsável'], processos.map(item => [
                this.value(item.nome), this.value(item.macroprocesso_nome || item.unidade_nome || item.unidade), this.value(item.setor_nome || item.setor),
                this.value(item.status_fase), `${this.number(item.percentual_conclusao)}%`, this.value(item.responsavel_nome || item.responsavel)
            ]));
            this.section(doc, 'PROCESSOS QUE EXIGEM ATENÇÃO');
            const attention = processos.filter(item => this.number(item.percentual_conclusao) < 50 || item.status_fase === 'Devolvido');
            if (attention.length) this.table(doc, ['Processo', 'Fase', 'Motivo', 'Responsável'], attention.map(item => [this.value(item.nome), this.value(item.status_fase), item.status_fase === 'Devolvido' ? 'Processo devolvido' : 'Conformidade abaixo de 50%', this.value(item.responsavel_nome || item.responsavel)]));
            else this.note(doc, 'Nenhum processo requer atenção no escopo selecionado.');
        });
    }

    static gerarRelatarioIndicadores(indicadores = [], resumo = {}, filtros = {}, contexto = {}) {
        return this.generate('RELATÓRIO DE INDICADORES', filtros, contexto, doc => {
            const measured = indicadores.filter(item => item.valor_atual !== null && item.valor_atual !== undefined);
            const reached = indicadores.filter(item => this.indicatorReached(item));
            this.section(doc, 'RESUMO EXECUTIVO');
            this.metrics(doc, [
                ['Total de Indicadores', resumo.total ?? indicadores.length],
                ['Meta atingida', reached.length],
                ['Meta não atingida', measured.length - reached.length],
                ['Sem medição', indicadores.length - measured.length]
            ]);
            this.section(doc, 'DISTRIBUIÇÃO DOS INDICADORES');
            const types = [...new Set(indicadores.map(item => this.value(item.tipo_indicador)))];
            this.table(doc, ['Tipo', 'Quantidade', 'Percentual'], types.map(type => {
                const count = indicadores.filter(item => this.value(item.tipo_indicador) === type).length;
                return [type, count, `${this.number(indicadores.length ? count * 100 / indicadores.length : 0)}%`];
            }));
            this.section(doc, 'DETALHAMENTO DOS INDICADORES');
            this.table(doc, ['Indicador', 'Processo', 'Periodicidade', 'Meta', 'Atual', 'Situação'], indicadores.map(item => [
                this.value(item.nome), this.value(item.processo_nome || item.processo), this.value(item.periodicidade), this.value(item.valor_meta), this.value(item.valor_atual), this.indicatorReached(item) ? 'Meta atingida' : (item.valor_atual === null || item.valor_atual === undefined ? 'Sem medição' : 'Meta não atingida')
            ]));
            this.section(doc, 'INDICADORES FORA DA META');
            const missed = indicadores.filter(item => !this.indicatorReached(item) && item.valor_atual !== null && item.valor_atual !== undefined);
            if (missed.length) this.table(doc, ['Indicador', 'Processo', 'Meta', 'Atual', 'Desvio'], missed.map(item => [this.value(item.nome), this.value(item.processo_nome || item.processo), this.value(item.valor_meta), this.value(item.valor_atual), this.value(this.number(item.valor_atual - item.valor_meta))]));
            else this.note(doc, 'Nenhum indicador fora da meta no escopo selecionado.');
        });
    }

    static gerarRelatarioLogs(logs = [], filtros = {}, contexto = {}) {
        return this.generate('RELATÓRIO DE AUDITORIA', filtros, contexto, doc => {
            const users = new Set(logs.map(log => this.value(log.usuario_nome || log.usuario_id)));
            const processes = new Set(logs.map(log => log.processo_nome).filter(Boolean));
            this.section(doc, 'RESUMO EXECUTIVO');
            this.metrics(doc, [['Total de registros', logs.length], ['Usuários envolvidos', users.size], ['Processos afetados', processes.size], ['Período analisado', this.period(filtros)]]);
            this.section(doc, 'HISTÓRICO DE ATIVIDADES');
            if (logs.length) this.table(doc, ['Data/Hora', 'Usuário', 'Perfil', 'Ação', 'Processo', 'Fase / Atividade', 'Unidade'], logs.map(log => [
                this.dateTime(log.criado_em || log.data_acao), this.value(log.usuario_nome || (log.usuario_id ? `Usuário não localizado (ID ${log.usuario_id})` : null)), this.value(log.usuario_perfil || log.perfil), this.action(log.acao), this.value(log.processo_nome), this.activity(log.fase, log.activityCode || log.codigo_atividade), this.value(log.unidade_nome || log.setor_nome)
            ]));
            else this.note(doc, 'Nenhum registro de auditoria encontrado para o período.');
        });
    }

    static generate(title, filtros, contexto, render) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true });
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);
                this.header(doc, title, true);
                this.metadata(doc, filtros, contexto);
                render(doc);
                this.footers(doc);
                doc.end();
            } catch (error) { reject(error); }
        });
    }

    static header(doc, title, full = false) {
        const theme = this.THEME;
        const logo = path.join(__dirname, '../../public/assets/images/logo-sge-pci-removebg-preview.png');
        if (full && fs.existsSync(logo)) doc.image(logo, 48, 35, { fit: [58, 58] });
        doc.fillColor(theme.text).font('Helvetica-Bold').fontSize(full ? 12 : 10).text(theme.government, 118, 31, { width: 400, align: 'center' });
        doc.fontSize(10).text(theme.department, 118, 46, { width: 400, align: 'center' });
        doc.fontSize(11).text(theme.institution, 118, 61, { width: 400, align: 'center' });
        doc.fillColor(theme.primary).fontSize(full ? 9 : 8).text(`${theme.system} | Sistema de Gestão Estratégica`, 118, 78, { width: 400, align: 'center' });
        doc.moveTo(45, 105).lineTo(550, 105).lineWidth(1).strokeColor(theme.border).stroke();
        doc.fillColor(theme.primary).font('Helvetica-Bold').fontSize(17).text(title, 45, 120, { width: 505, align: 'center' });
        doc.y = 150;
    }

    static metadata(doc, filtros = {}, contexto = {}) {
        const lines = [`Gerado em: ${this.dateTime(new Date())}`, `Gerado por: ${this.value(contexto.usuario_nome || contexto.usuario)}`, `Perfil: ${this.value(contexto.perfil)}`, `Escopo: ${this.value(contexto.escopo, 'Todos os dados permitidos ao usuário')}`];
        const periodText = this.period(filtros);
        if (periodText !== 'Não informado') lines.push(`Período: ${periodText}`);
        const applied = Object.entries(filtros).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => `${key}: ${value}`);
        if (applied.length) lines.push(`Filtros aplicados: ${applied.join(' | ')}`);
        doc.fillColor(this.THEME.muted).font('Helvetica').fontSize(8).text(lines.join('\n'), { width: 505, lineGap: 1 });
        doc.moveDown(0.8);
    }

    static section(doc, title) {
        this.ensureSpace(doc, 34);
        const y = doc.y;
        doc.fillColor(this.THEME.section).rect(45, y, 505, 23).fill();
        doc.lineWidth(1).strokeColor(this.THEME.border).rect(45, y, 505, 23).stroke();
        doc.fillColor(this.THEME.text).font('Helvetica-Bold').fontSize(11).text(title, 52, y + 6, { width: 490 });
        doc.y = y + 32;
    }

    static metrics(doc, items) {
        const columns = 4;
        const width = 505 / columns;
        const y = doc.y;
        items.forEach(([label, value], index) => {
            const x = 45 + index * width;
            doc.fillColor(this.THEME.zebra).rect(x, y, width, 42).fill();
            doc.strokeColor(this.THEME.border).rect(x, y, width, 42).stroke();
            doc.fillColor(this.THEME.primary).font('Helvetica-Bold').fontSize(13).text(this.value(value), x + 6, y + 7, { width: width - 12, align: 'center' });
            doc.fillColor(this.THEME.text).font('Helvetica').fontSize(7).text(label, x + 4, y + 26, { width: width - 8, align: 'center' });
        });
        doc.y = y + 52;
    }

    static table(doc, headers, rows) {
        if (!headers.length) return;
        const widths = headers.map((_, index) => 505 / headers.length);
        const drawHeader = () => {
            const y = doc.y;
            headers.forEach((header, index) => this.tableCell(doc, 45 + widths.slice(0, index).reduce((a, b) => a + b, 0), y, widths[index], 25, header, this.THEME.section, true));
            doc.y = y + 25;
        };
        drawHeader();
        rows.forEach((row, rowIndex) => {
            const values = row.map(value => this.value(value));
            const height = Math.max(24, ...values.map((value, index) => this.textHeight(value, widths[index] - 10, 7.5) + 8));
            if (doc.y + height > 770) { doc.addPage(); this.header(doc, 'SGE PCI/RN', false); drawHeader(); }
            const y = doc.y;
            values.forEach((value, index) => this.tableCell(doc, 45 + widths.slice(0, index).reduce((a, b) => a + b, 0), y, widths[index], height, value, rowIndex % 2 ? this.THEME.zebra : this.THEME.white, false));
            doc.y = y + height;
        });
        doc.moveDown(0.6);
    }

    static tableCell(doc, x, y, width, height, value, fill, bold) {
        doc.fillColor(fill).rect(x, y, width, height).fill();
        doc.lineWidth(0.7).strokeColor(this.THEME.border).rect(x, y, width, height).stroke();
        doc.fillColor(this.THEME.text).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 7.5 : 7.2).text(value, x + 5, y + 7, { width: width - 10, height: height - 10, lineGap: 0.5 });
    }

    static note(doc, text) {
        this.ensureSpace(doc, 28);
        doc.fillColor(this.THEME.muted).font('Helvetica').fontSize(9).text(text, 52, doc.y, { width: 490 });
        doc.moveDown(0.7);
    }

    static ensureSpace(doc, height) {
        if (doc.y + height > 770) { doc.addPage(); this.header(doc, 'SGE PCI/RN', false); }
    }

    static footers(doc) {
        const range = doc.bufferedPageRange();
        for (let index = 0; index < range.count; index++) {
            doc.switchToPage(index);
            const y = doc.page.height - 42;
            const originalBottomMargin = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;
            doc.moveTo(45, y).lineTo(550, y).strokeColor(this.THEME.border).stroke();
            doc.fillColor(this.THEME.muted).font('Helvetica').fontSize(7.5).text('SGE PCI/RN | Polícia Científica do Rio Grande do Norte', 45, y + 8, { width: 350 });
            doc.text(`Página ${index + 1} de ${range.count}`, 445, y + 8, { width: 105, align: 'right' });
            doc.page.margins.bottom = originalBottomMargin;
        }
    }

    static textHeight(text, width, fontSize) {
        const chars = Math.max(1, Math.floor(width / (fontSize * 0.48)));
        return Math.ceil(String(text).length / chars) * (fontSize + 2);
    }

    static value(value, fallback = 'Não informado') {
        if (value === null || value === undefined || value === '') return fallback;
        return String(value);
    }

    static number(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number.toFixed(0) : '0';
    }

    static average(values) {
        const numbers = values.map(Number).filter(Number.isFinite);
        return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0;
    }

    static countStatuses(items, statuses) { return items.filter(item => statuses.includes(item.status_fase)).length; }

    static indicatorReached(item) {
        if (item.valor_atual === null || item.valor_atual === undefined || item.valor_meta === null || item.valor_meta === undefined) return false;
        return Number(item.valor_atual) >= Number(item.valor_meta);
    }

    static dateTime(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }

    static period(filters = {}) {
        if (!filters.data_inicio && !filters.data_fim) return 'Não informado';
        return `${filters.data_inicio ? new Date(filters.data_inicio).toLocaleDateString('pt-BR') : 'início'} a ${filters.data_fim ? new Date(filters.data_fim).toLocaleDateString('pt-BR') : 'fim'}`;
    }

    static action(action) {
        const map = { LOGIN_SUCCESS: 'Login realizado', ACTIVITY_COMPLETED: 'Atividade concluída', PROCESS_CREATED: 'Processo criado', PROCESS_APPROVED: 'Processo aprovado', PROCESS_RETURNED: 'Processo devolvido para correção', INDICATOR_UPDATED: 'Indicador atualizado' };
        return this.value(map[action] || action);
    }

    static activity(phase, code) {
        const map = { PLAN_A: 'Definir objetivos', PLAN_B: 'Definir equipe de melhoria', ANAL_A: 'Analisar processo atual', DES_A: 'Redefinir escopo do processo', DES_B: 'Modelar fluxo TO-BE', DES_E: 'Definir indicadores', DES_F: 'Documentar o processo', DES_G: 'Elaborar plano de implementação', IMPL_A: 'Implementar melhorias', MON_C: 'Monitorar resultados' };
        const label = map[code] || this.value(code);
        return phase ? `${phase} - ${label}` : label;
    }
}

module.exports = PDFGenerator;
