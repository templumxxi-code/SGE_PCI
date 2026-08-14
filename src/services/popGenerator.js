// ============================================================================
// POP Generator Service - Procedimento Operacional Padrão
// ============================================================================
// Serviço para gerar Procedimentos Operacionais Padrão em PDF
// com identidade visual da Polícia Científica do RN

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class POPGenerator {
    /**
     * Cores da Polícia Científica do RN
     */
    static get COLORS() {
        return {
            primary: '#0052CC',      // Azul principal
            secondary: '#003A99',    // Azul escuro
            accent: '#FF6B35',       // Laranja
            success: '#00B894',      // Verde
            warning: '#FDCB6E',      // Amarelo
            danger: '#D63031',       // Vermelho
            text: '#2C3E50',         // Cinza escuro
            lightText: '#7F8C8D',    // Cinza claro
            lightBg: '#ECF0F1',      // Cinza muito claro
            border: '#BDC3C7'        // Cinza médio
        };
    }

    /**
     * Gerar Procedimento Operacional Padrão em PDF
     */
    static gerarPOP(dadosProcesso, dadosAtividades = {}, filtros = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    bufferPages: true
                });

                // Buffer para armazenar o PDF
                const chunks = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
                doc.on('error', reject);

                // Cabeçalho
                this.adicionarCabecalho(doc, 'PROCEDIMENTO OPERACIONAL PADRÃO - POP');

                // Seção 1: Identificação
                doc.fontSize(14).font('Helvetica-Bold').fillColor(this.COLORS.primary).text('1. Identificação do Procedimento', { underline: true });
                doc.moveDown(0.3);
                this.adicionarSecaoIdentificacao(doc, dadosProcesso);

                doc.moveDown(0.5);

                // Seção 2: Objetivo e Escopo
                doc.fontSize(14).font('Helvetica-Bold').fillColor(this.COLORS.primary).text('2. Objetivo e Escopo', { underline: true });
                doc.moveDown(0.3);
                this.adicionarSecaoObjetivo(doc, dadosProcesso, dadosAtividades);

                doc.moveDown(0.5);

                // Seção 3: Responsabilidades
                doc.fontSize(14).font('Helvetica-Bold').fillColor(this.COLORS.primary).text('3. Responsabilidades', { underline: true });
                doc.moveDown(0.3);
                this.adicionarSecaoResponsabilidades(doc, dadosAtividades);

                doc.moveDown(0.5);

                // Seção 4: Fluxo do Processo
                doc.fontSize(14).font('Helvetica-Bold').fillColor(this.COLORS.primary).text('4. Fluxo do Processo', { underline: true });
                doc.moveDown(0.3);
                this.adicionarSecaoFluxo(doc, dadosAtividades);

                doc.moveDown(0.5);

                // Seção 5: Indicadores
                doc.fontSize(14).font('Helvetica-Bold').fillColor(this.COLORS.primary).text('5. Indicadores de Desempenho', { underline: true });
                doc.moveDown(0.3);
                this.adicionarSecaoIndicadores(doc, dadosAtividades);

                doc.moveDown(0.5);

                // Seção 6: Documentos de Referência
                doc.fontSize(14).font('Helvetica-Bold').fillColor(this.COLORS.primary).text('6. Documentos de Referência', { underline: true });
                doc.moveDown(0.3);
                this.adicionarSecaoDocumentos(doc, dadosAtividades);

                doc.moveDown(0.5);

                // Seção 7: Histórico de Alterações
                doc.fontSize(14).font('Helvetica-Bold').fillColor(this.COLORS.primary).text('7. Histórico de Alterações', { underline: true });
                doc.moveDown(0.3);
                this.adicionarSecaoHistorico(doc, dadosProcesso);

                // Rodapé
                doc.moveDown(1);
                this.adicionarRodape(doc);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Adicionar cabeçalho com logo e título
     */
    static adicionarCabecalho(doc, titulo) {
        const logoPath = path.join(__dirname, '../../public/assets/images/logo-sge-pci-removebg-preview.png');
        
        // Tenta adicionar logo se existir
        try {
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 30, { width: 60, height: 60 });
            }
        } catch (error) {
            console.warn('Logo não encontrada:', logoPath);
        }

        // Informações institucionais
        doc.fontSize(14).font('Helvetica-Bold').fillColor(this.COLORS.primary)
            .text('Polícia Científica do Rio Grande do Norte', 120, 35);
        
        doc.fontSize(11).font('Helvetica').fillColor(this.COLORS.secondary)
            .text('Sistema de Gestão Estratégica - SGE PCI/RN', 120, 52);
        
        // Linha separadora
        doc.moveTo(50, 100).lineTo(545, 100).stroke(this.COLORS.border);
        
        // Título do documento
        doc.fontSize(16).font('Helvetica-Bold').fillColor(this.COLORS.primary)
            .text(titulo, { align: 'center', top: 110 });
        
        doc.moveDown(0.5);
    }

    /**
     * Adicionar seção de identificação
     */
    static adicionarSecaoIdentificacao(doc, dadosProcesso) {
        const data = {
            'Nome do Processo': dadosProcesso.nome || 'N/A',
            'Macroprocesso': dadosProcesso.macroprocesso || 'N/A',
            'Setor/Núcleo': dadosProcesso.setor_nome || `Setor ${dadosProcesso.setor_id}` || 'N/A',
            'Responsável': dadosProcesso.responsavel_nome || 'N/A',
            'Data de Criação': dadosProcesso.data_inicio 
                ? new Date(dadosProcesso.data_inicio).toLocaleDateString('pt-BR') 
                : 'N/A',
            'Versão': dadosProcesso.versao || '1.0'
        };

        doc.fontSize(11).font('Helvetica');
        
        Object.entries(data).forEach(([chave, valor]) => {
            doc.fillColor(this.COLORS.text);
            doc.font('Helvetica-Bold').text(`${chave}: `, { continued: true });
            doc.font('Helvetica').text(String(valor));
        });
    }

    /**
     * Adicionar seção de objetivo
     */
    static adicionarSecaoObjetivo(doc, dadosProcesso, dadosAtividades) {
        doc.fontSize(11).font('Helvetica').fillColor(this.COLORS.text);
        
        const objetivo = dadosProcesso.objetivo || dadosAtividades['PLAN_A']?.objective || 'Objetivo não definido';
        
        doc.text('Objetivo:', { underline: true });
        doc.font('Helvetica').text(String(objetivo), { align: 'justify' });
        
        doc.moveDown(0.3);
        
        const escopo = dadosAtividades['DES_A'] || 'Escopo não definido';
        doc.text('Escopo:', { underline: true });
        doc.font('Helvetica').text(String(escopo), { align: 'justify' });
    }

    /**
     * Adicionar seção de responsabilidades
     */
    static adicionarSecaoResponsabilidades(doc, dadosAtividades) {
        doc.fontSize(11).font('Helvetica').fillColor(this.COLORS.text);
        
        const responsabilidades = [
            `Responsável geral: A ser definido conforme processo`,
            `Equipe: Membros definidos na fase de Planejamento`,
            'Estrutura organizacional: A ser preenchida conforme organograma da instituição'
        ];

        responsabilidades.forEach(resp => {
            doc.text(`• ${resp}`);
        });
    }

    /**
     * Adicionar seção de fluxo
     */
    static adicionarSecaoFluxo(doc, dadosAtividades) {
        doc.fontSize(11).font('Helvetica').fillColor(this.COLORS.text);
        
        const etapas = [
            { nome: 'Planejamento', desc: dadosAtividades['PLAN_A']?.description || 'Definição dos objetivos' },
            { nome: 'Análise', desc: 'Compreensão do processo atual (AS-IS)' },
            { nome: 'Desenho', desc: 'Modelagem do processo otimizado (TO-BE)' },
            { nome: 'Implementação', desc: 'Execução das mudanças no processo' },
            { nome: 'Monitoramento', desc: 'Acompanhamento e melhorias contínuas' }
        ];

        let yPosition = doc.y;
        etapas.forEach((etapa, idx) => {
            doc.font('Helvetica-Bold').text(`${idx + 1}. ${etapa.nome}:`, { continued: false });
            doc.font('Helvetica').text(`   ${etapa.desc}`);
        });
    }

    /**
     * Adicionar seção de indicadores
     */
    static adicionarSecaoIndicadores(doc, dadosAtividades) {
        doc.fontSize(11).font('Helvetica').fillColor(this.COLORS.text);
        
        const indicadores = dadosAtividades['DES_E']?.indicators || [];
        
        if (Array.isArray(indicadores) && indicadores.length > 0) {
            indicadores.forEach((ind, idx) => {
                doc.text(`${idx + 1}. ${ind.nome || 'Indicador'}`);
                doc.fontSize(10).text(`   Meta: ${ind.meta || 'N/A'}`);
                doc.text(`   Frequência: ${ind.frequencia || 'N/A'}`);
            });
        } else {
            doc.text('Indicadores não definidos nesta fase.');
        }
    }

    /**
     * Adicionar seção de documentos de referência
     */
    static adicionarSecaoDocumentos(doc, dadosAtividades) {
        doc.fontSize(11).font('Helvetica').fillColor(this.COLORS.text);
        
        const documentos = [
            'Anexo I - Diagrama de Escopo e Interface',
            'Anexo II - Plano do Projeto',
            'Anexo IV - Análise de Riscos',
            'Anexo VI - Documentação Descritiva',
            'Anexo VII - Plano de Implementação',
            'Anexo VIII - Plano de Capacitação'
        ];

        documentos.forEach(doc_item => {
            doc.text(`• ${doc_item}`);
        });
    }

    /**
     * Adicionar seção de histórico
     */
    static adicionarSecaoHistorico(doc, dadosProcesso) {
        doc.fontSize(11).font('Helvetica').fillColor(this.COLORS.text);
        
        const dataGeracao = new Date().toLocaleDateString('pt-BR');
        
        doc.text(`Versão 1.0 - ${dataGeracao}`);
        doc.text('Criação do Procedimento Operacional Padrão no SGE PCI/RN');
    }

    /**
     * Adicionar rodapé
     */
    static adicionarRodape(doc) {
        const pageCount = doc.bufferedPageRange().count;
        
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            
            // Linha separadora
            doc.moveTo(50, doc.page.height - 50)
                .lineTo(545, doc.page.height - 50)
                .stroke(this.COLORS.border);
            
            // Informações de rodapé
            doc.fontSize(9).fillColor(this.COLORS.lightText)
                .text('Procedimento Operacional Padrão - SGE PCI/RN', 50, doc.page.height - 40, { align: 'left' })
                .text(`Página ${i + 1} de ${pageCount}`, 480, doc.page.height - 40, { align: 'right' });
        }
    }
}

module.exports = POPGenerator;
