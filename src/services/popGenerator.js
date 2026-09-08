const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class POPGenerator {
    static get COLORS() {
        return { bg: '#FFFFFF', text: '#000000', headerBg: '#C9D9F2', border: '#666666' };
    }

    static gerarPOP(dadosProcesso = {}, dadosAtividades = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, autoFirstPage: false });
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);
                const data = this.mapFields(dadosProcesso, dadosAtividades);
                this.renderPageOne(doc, data);
                this.renderPageTwo(doc, data);
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    static value(value, fallback = 'Não informado') {
        if (value === null || value === undefined) return fallback;
        if (Array.isArray(value)) {
            const items = value.map(item => this.value(item, '')).filter(Boolean);
            return items.length ? items.join('\n') : fallback;
        }
        if (typeof value === 'object') {
            return this.value(value.text || value.nome || value.name || value.descricao || value.description, fallback);
        }
        const text = String(value).trim();
        return text || fallback;
    }

    static activity(activities, code) {
        return activities[code] || {};
    }

    static first(values, fallback = 'Não informado') {
        for (const item of values) {
            const text = this.value(item, '');
            if (text) return text;
        }
        return fallback;
    }

    static date(value) {
        if (!value) return 'Não informado';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? this.value(value) : date.toLocaleDateString('pt-BR');
    }

    static mapFields(process, activities) {
        const plan = this.activity(activities, 'PLAN_A');
        const designScope = this.activity(activities, 'DES_A');
        const designFlow = this.activity(activities, 'DES_B');
        const designDocs = this.activity(activities, 'DES_F');
        const processData = process || {};
        const all = [processData, plan, designScope, designFlow, designDocs];
        const field = name => all.map(item => item && (item[name] || item.content?.[name]));
        const attachments = Object.values(activities).flatMap(activity => {
            const source = activity.attachments || activity.content?.attachments || activity.anexos;
            return Array.isArray(source) ? source : source ? [source] : [];
        });

        return {
            titulo: this.first([processData.nome, processData.name]),
            area: this.first([processData.area, processData.instituto, processData.regional, processData.assessoria, processData.macroprocesso_nome, processData.macroprocesso]),
            setor: this.first([processData.setor_nome, processData.setor]),
            paginas: '2',
            versao: this.first([processData.versao, processData.version], '1.0'),
            ultimaRevisao: this.date(processData.ultimaRevisao || processData.data_revisao || processData.atualizado_em || processData.criado_em),
            finalidade: this.first([processData.finalidade, processData.objetivo, plan.objective, plan.content?.objective, designScope.finalidade, designScope.content?.finalidade]),
            publicoAlvo: this.first(field('publicoAlvo').concat(field('publico_alvo'))),
            materialRecomendado: this.first(field('materialRecomendado').concat(field('material_recomendado'))),
            procedimentosOperacionais: this.first([designFlow.procedimentosOperacionais, designFlow.procedimentos, designFlow.content?.procedimentosOperacionais, designFlow.content?.procedimentos, designDocs.procedimentosOperacionais, designDocs.content?.procedimentosOperacionais]),
            orientacoes: this.first(field('orientacoes').concat(field('orientações'))),
            definicoesAbreviaturas: this.first(field('definicoesAbreviaturas').concat(field('definicoes_abreviaturas')).concat(field('definicoes'))),
            fluxograma: this.first([designFlow.fluxograma, designFlow.fluxogramaToBe, designFlow.fluxograma_to_be, designFlow.content?.fluxograma, designFlow.descricao, designFlow.description, 'Fluxo TO-BE']),
            anexos: this.first([processData.anexos, processData.attachments, attachments]),
            elaboradores: this.first([processData.elaboradores, processData.equipe, processData.teamMembers, designDocs.elaboradores, designDocs.content?.elaboradores, processData.responsavel_nome]),
            revisor: this.first([processData.revisor, processData.reviewer, designDocs.revisor, designDocs.content?.revisor], 'Pendente de revisão'),
            homologador: this.first([processData.homologador, processData.aprovador, processData.approver, designDocs.homologador, designDocs.content?.homologador], 'Pendente de homologação')
        };
    }

    static configure(doc) {
        doc.fillColor(this.COLORS.text).font('Helvetica').fontSize(10);
    }

    static cell(doc, x, y, width, height, text = '', options = {}) {
        doc.save().fillColor(options.header ? this.COLORS.headerBg : this.COLORS.bg).rect(x, y, width, height).fill();
        doc.restore().lineWidth(1.25).strokeColor(this.COLORS.border).rect(x, y, width, height).stroke();
        doc.fillColor(this.COLORS.text).font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(options.fontSize || 10)
            .text(this.value(text), x + (options.padding || 6), y + (options.padding || 6), {
                width: width - ((options.padding || 6) * 2),
                height: height - ((options.padding || 6) * 2),
                align: options.align || 'left',
                lineGap: 1
            });
    }

    static renderHeader(doc, y) {
        const x = 50;
        const left = 119;
        const center = 267;
        const right = 109;
        const height = 132;
        this.cell(doc, x, y, left, height, '', { padding: 8 });
        doc.fillColor(this.COLORS.text).font('Helvetica-Bold').fontSize(38).text('POP', x + 8, y + 35, { width: left - 16, align: 'center' });
        doc.fontSize(9).text('Procedimento Operacional\nPadrão - POP', x + 8, y + 91, { width: left - 16, align: 'center' });
        this.cell(doc, x + left, y, center, height, 'Governo do Rio Grande do Norte\nSecretaria de Segurança Pública e da Defesa Social\nPolícia Científica do RN\nDireção Geral', { bold: true, align: 'center', fontSize: 11, padding: 10 });
        this.cell(doc, x + left + center, y, right, height, '', { padding: 4 });
        const logoPath = path.join(__dirname, '../../public/assets/images/logo-sge-pci-removebg-preview.png');
        if (fs.existsSync(logoPath)) doc.image(logoPath, x + left + center + 24, y + 22, { fit: [right - 48, height - 44], align: 'center', valign: 'center' });
        return y + height;
    }

    static renderPageOne(doc, data) {
        doc.addPage({ size: 'A4', margin: 0 });
        this.configure(doc);
        const x = 50;
        const width = 495;
        let y = 45;
        y = this.renderHeader(doc, y);
        const labelWidth = 128;
        const valueWidth = 119.5;
        const rowHeight = 27;
        const pairs = [
            ['1. Título:', data.titulo, '2. Área:', data.area],
            ['3. Setor:', data.setor, '4. Páginas:', data.paginas],
            ['5. Versão:', data.versao, '6. Última Revisão:', data.ultimaRevisao]
        ];
        pairs.forEach(row => {
            this.cell(doc, x, y, labelWidth, rowHeight, row[0], { header: true, bold: true, fontSize: 10 });
            this.cell(doc, x + labelWidth, y, valueWidth, rowHeight, row[1], { fontSize: 9 });
            this.cell(doc, x + labelWidth + valueWidth, y, labelWidth, rowHeight, row[2], { header: true, bold: true, fontSize: 10 });
            this.cell(doc, x + (labelWidth * 2) + valueWidth, y, valueWidth, rowHeight, row[3], { fontSize: 9 });
            y += rowHeight;
        });
        const sections = [
            ['7. Finalidade:', data.finalidade, 42],
            ['8. Público Alvo:', data.publicoAlvo, 42],
            ['9. Material Recomendado:', data.materialRecomendado, 118],
            ['10. Procedimentos Operacionais:', data.procedimentosOperacionais, 78],
            ['11. Orientações:', data.orientacoes, 30],
            ['12. Definições/Abreviaturas:', data.definicoesAbreviaturas, 30]
        ];
        sections.forEach(([label, value, height]) => {
            this.cell(doc, x, y, width, 27, label, { header: true, bold: true, fontSize: 10 });
            this.cell(doc, x, y + 27, width, height, value, { fontSize: 9, padding: 7 });
            y += 27 + height;
        });
    }

    static renderPageTwo(doc, data) {
        doc.addPage({ size: 'A4', margin: 0 });
        this.configure(doc);
        const x = 50;
        const width = 495;
        let y = 45;
        const sections = [
            ['13. Fluxograma:', data.fluxograma, 150],
            ['14. Anexos:', data.anexos, 235],
            ['15. Elaboradores:', data.elaboradores, 34],
            ['16. Revisor:', data.revisor, 34],
            ['17. Homologador:', data.homologador, 34]
        ];
        sections.forEach(([label, value, height]) => {
            this.cell(doc, x, y, width, 27, label, { header: true, bold: true, fontSize: 10 });
            this.cell(doc, x, y + 27, width, height, value, { fontSize: 9, padding: 7 });
            y += 27 + height;
        });
    }
}

module.exports = POPGenerator;
