// ============================================================================
// SMP PCI - PDF Generator Service
// ============================================================================
// Serviço para gerar relatórios em PDF com identidade visual da Polícia Científica do RN

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
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
     * Gerar relatório de processos em PDF
     */
    static gerarRelatarioProcessos(dadosProcessos, resumo, filtros = {}) {
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
                this.adicionarCabecalho(doc, 'RELATÓRIO DE PROCESSOS');

                // Informações do período
                this.adicionarInfoPeriodo(doc, filtros);

                // Resumo executivo
                doc.fontSize(14).font('Helvetica-Bold').text('Resumo Executivo', { underline: true });
                doc.moveDown(0.3);
                this.adicionarResumoProcessos(doc, resumo, filtros);

                doc.moveDown(0.5);

                // Tabela de processos
                if (dadosProcessos && dadosProcessos.length > 0) {
                    doc.fontSize(14).font('Helvetica-Bold').text('Detalhes dos Processos', { underline: true });
                    doc.moveDown(0.3);
                    this.adicionarTabelaProcessos(doc, dadosProcessos);
                } else {
                    doc.fontSize(12).font('Helvetica').fillColor(this.COLORS.warning)
                        .text('Nenhum processo encontrado para o período especificado.', { align: 'center' });
                }

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
     * Gerar relatório de indicadores em PDF
     */
    static gerarRelatarioIndicadores(dadosIndicadores, resumo, filtros = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    bufferPages: true
                });

                const chunks = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
                doc.on('error', reject);

                // Cabeçalho
                this.adicionarCabecalho(doc, 'RELATÓRIO DE INDICADORES E KPIs');

                // Informações do período
                this.adicionarInfoPeriodo(doc, filtros);

                // Resumo executivo
                doc.fontSize(14).font('Helvetica-Bold').text('Resumo Executivo', { underline: true });
                doc.moveDown(0.3);
                this.adicionarResumoIndicadores(doc, resumo, filtros);

                doc.moveDown(0.5);

                // Tabela de indicadores
                if (dadosIndicadores && dadosIndicadores.length > 0) {
                    doc.fontSize(14).font('Helvetica-Bold').text('Detalhes dos Indicadores', { underline: true });
                    doc.moveDown(0.3);
                    this.adicionarTabelaIndicadores(doc, dadosIndicadores);
                } else {
                    doc.fontSize(12).font('Helvetica').fillColor(this.COLORS.warning)
                        .text('Nenhum indicador encontrado para o período especificado.', { align: 'center' });
                }

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
     * Gerar relatório de logs/auditoria em PDF
     */
    static gerarRelatarioLogs(dadosLogs, filtros = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    bufferPages: true
                });

                const chunks = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
                doc.on('error', reject);

                // Cabeçalho
                this.adicionarCabecalho(doc, 'RELATÓRIO DE AUDITORIA');

                // Informações do período
                this.adicionarInfoPeriodo(doc, filtros);

                // Resumo
                doc.fontSize(14).font('Helvetica-Bold').text('Resumo', { underline: true });
                doc.moveDown(0.3);
                doc.fontSize(11).font('Helvetica').fillColor(this.COLORS.text);
                doc.text(`Total de registros: ${dadosLogs ? dadosLogs.length : 0}`, { indent: 10 });
                doc.moveDown(0.5);

                // Tabela de logs
                if (dadosLogs && dadosLogs.length > 0) {
                    doc.fontSize(14).font('Helvetica-Bold').text('Histórico de Atividades', { underline: true });
                    doc.moveDown(0.3);
                    this.adicionarTabelaLogs(doc, dadosLogs);
                } else {
                    doc.fontSize(12).font('Helvetica').fillColor(this.COLORS.warning)
                        .text('Nenhum registro de auditoria encontrado para o período.', { align: 'center' });
                }

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
     * Adicionar cabeçalho com logo e informações institucionais
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
        
        // Título do relatório
        doc.fontSize(16).font('Helvetica-Bold').fillColor(this.COLORS.primary)
            .text(titulo, { align: 'center', top: 110 });
        
        doc.moveDown(0.5);
    }

    /**
     * Adicionar informações do período
     */
    static adicionarInfoPeriodo(doc, filtros = {}) {
        const dataGeracao = new Date();
        const dataFormatada = dataGeracao.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        doc.fontSize(10).font('Helvetica').fillColor(this.COLORS.lightText);
        
        let infoTexto = `Gerado em: ${dataFormatada}`;
        
        if (filtros.data_inicio) {
            const dataInicio = new Date(filtros.data_inicio).toLocaleDateString('pt-BR');
            infoTexto += ` | Período inicial: ${dataInicio}`;
        }
        
        if (filtros.data_fim) {
            const dataFim = new Date(filtros.data_fim).toLocaleDateString('pt-BR');
            infoTexto += ` | Período final: ${dataFim}`;
        }

        doc.text(infoTexto, { align: 'right' });
        doc.moveDown(0.5);
    }

    /**
     * Adicionar resumo de processos
     */
    static adicionarResumoProcessos(doc, resumo, filtros) {
        if (!resumo) return;

        doc.fontSize(11).font('Helvetica').fillColor(this.COLORS.text);
        
        // Box com informações principais
        const startY = doc.y;
        const boxWidth = 500;
        const boxHeight = 60;

        // Fundo do box
        doc.rect(45, startY, boxWidth, boxHeight).fillAndStroke(this.COLORS.lightBg, this.COLORS.border);

        doc.fillColor(this.COLORS.text);
        let infoY = startY + 8;

        doc.fontSize(10).font('Helvetica-Bold')
            .text(`Total de processos: ${resumo.total}`, 55, infoY);

        if (resumo.porStatus) {
            let statusTexto = 'Status: ';
            for (const [status, count] of Object.entries(resumo.porStatus)) {
                statusTexto += `${status} (${count}) | `;
            }
            doc.text(statusTexto.slice(0, -3), 55, infoY + 18);
        }

        if (resumo.percentualMedioConformidade !== undefined) {
            doc.text(`Conformidade média: ${resumo.percentualMedioConformidade.toFixed(2)}%`, 55, infoY + 36);
        }

        doc.moveDown(4);
    }

    /**
     * Adicionar resumo de indicadores
     */
    static adicionarResumoIndicadores(doc, resumo, filtros) {
        if (!resumo) return;

        doc.fontSize(11).font('Helvetica').fillColor(this.COLORS.text);
        
        const startY = doc.y;
        const boxWidth = 500;
        const boxHeight = 60;

        doc.rect(45, startY, boxWidth, boxHeight).fillAndStroke(this.COLORS.lightBg, this.COLORS.border);

        doc.fillColor(this.COLORS.text);
        let infoY = startY + 8;

        doc.fontSize(10).font('Helvetica-Bold')
            .text(`Total de indicadores: ${resumo.total}`, 55, infoY);

        if (resumo.porTipo) {
            let tipoTexto = 'Por tipo: ';
            for (const [tipo, count] of Object.entries(resumo.porTipo)) {
                tipoTexto += `${tipo} (${count}) | `;
            }
            doc.text(tipoTexto.slice(0, -3), 55, infoY + 18);
        }

        if (resumo.conformidadeMedia !== undefined) {
            doc.text(`Conformidade média: ${resumo.conformidadeMedia.toFixed(2)}%`, 55, infoY + 36);
        }

        doc.moveDown(4);
    }

    /**
     * Adicionar tabela de processos
     */
    static adicionarTabelaProcessos(doc, processos) {
        const colWidth = 500 / 5;
        const rowHeight = 30;
        let y = doc.y;

        // Cabeçalho da tabela
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
        
        this.desenharCelulaTabela(doc, 50, y, colWidth, rowHeight, 'Nome', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth, y, colWidth, rowHeight, 'Setor', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth * 2, y, colWidth, rowHeight, 'Status', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth * 3, y, colWidth, rowHeight, 'Progresso', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth * 4, y, colWidth, rowHeight, 'Responsável', this.COLORS.primary);

        y += rowHeight;

        // Linhas da tabela
        doc.fontSize(8).font('Helvetica').fillColor(this.COLORS.text);
        
        processos.slice(0, 20).forEach((processo, idx) => {
            const bgColor = idx % 2 === 0 ? '#FFFFFF' : this.COLORS.lightBg;
            
            this.desenharCelulaTabela(doc, 50, y, colWidth, rowHeight, 
                (processo.nome || '').substring(0, 20), bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth, y, colWidth, rowHeight, 
                (processo.setor_nome || 'N/A').substring(0, 15), bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth * 2, y, colWidth, rowHeight, 
                processo.status_fase || 'N/A', bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth * 3, y, colWidth, rowHeight, 
                `${processo.percentual_conclusao || 0}%`, bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth * 4, y, colWidth, rowHeight, 
                (processo.responsavel_nome || 'N/A').substring(0, 15), bgColor);

            y += rowHeight;

            // Quebra de página se necessário
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
        });

        if (processos.length > 20) {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(this.COLORS.lightText)
                .text(`... e mais ${processos.length - 20} processos`);
        }

        doc.moveDown(0.5);
    }

    /**
     * Adicionar tabela de indicadores
     */
    static adicionarTabelaIndicadores(doc, indicadores) {
        const colWidth = 500 / 5;
        const rowHeight = 30;
        let y = doc.y;

        // Cabeçalho
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
        
        this.desenharCelulaTabela(doc, 50, y, colWidth, rowHeight, 'Indicador', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth, y, colWidth, rowHeight, 'Tipo', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth * 2, y, colWidth, rowHeight, 'Meta', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth * 3, y, colWidth, rowHeight, 'Atual', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth * 4, y, colWidth, rowHeight, 'Conformidade', this.COLORS.primary);

        y += rowHeight;

        // Linhas
        doc.fontSize(8).font('Helvetica').fillColor(this.COLORS.text);
        
        indicadores.slice(0, 20).forEach((indicador, idx) => {
            const bgColor = idx % 2 === 0 ? '#FFFFFF' : this.COLORS.lightBg;
            const conformidade = indicador.valor_meta > 0 
                ? ((indicador.valor_atual / indicador.valor_meta) * 100).toFixed(0)
                : '0';

            this.desenharCelulaTabela(doc, 50, y, colWidth, rowHeight, 
                (indicador.nome || '').substring(0, 20), bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth, y, colWidth, rowHeight, 
                (indicador.tipo_indicador || 'N/A').substring(0, 15), bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth * 2, y, colWidth, rowHeight, 
                indicador.valor_meta || 'N/A', bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth * 3, y, colWidth, rowHeight, 
                indicador.valor_atual || '0', bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth * 4, y, colWidth, rowHeight, 
                `${conformidade}%`, bgColor);

            y += rowHeight;

            if (y > 700) {
                doc.addPage();
                y = 50;
            }
        });

        if (indicadores.length > 20) {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(this.COLORS.lightText)
                .text(`... e mais ${indicadores.length - 20} indicadores`);
        }

        doc.moveDown(0.5);
    }

    /**
     * Adicionar tabela de logs
     */
    static adicionarTabelaLogs(doc, logs) {
        const colWidth = 500 / 4;
        const rowHeight = 25;
        let y = doc.y;

        // Cabeçalho
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
        
        this.desenharCelulaTabela(doc, 50, y, colWidth, rowHeight, 'Usuário', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth, y, colWidth, rowHeight, 'Ação', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth * 2, y, colWidth, rowHeight, 'Tabela', this.COLORS.primary);
        this.desenharCelulaTabela(doc, 50 + colWidth * 3, y, colWidth, rowHeight, 'Data/Hora', this.COLORS.primary);

        y += rowHeight;

        // Linhas
        doc.fontSize(8).font('Helvetica').fillColor(this.COLORS.text);
        
        logs.slice(0, 25).forEach((log, idx) => {
            const bgColor = idx % 2 === 0 ? '#FFFFFF' : this.COLORS.lightBg;
            const dataFormatada = log.criado_em 
                ? new Date(log.criado_em).toLocaleString('pt-BR')
                : 'N/A';

            this.desenharCelulaTabela(doc, 50, y, colWidth, rowHeight, 
                (log.usuario_id || 'N/A').toString().substring(0, 15), bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth, y, colWidth, rowHeight, 
                (log.acao || 'N/A').substring(0, 15), bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth * 2, y, colWidth, rowHeight, 
                (log.tabela || 'N/A').substring(0, 15), bgColor);
            this.desenharCelulaTabela(doc, 50 + colWidth * 3, y, colWidth, rowHeight, 
                dataFormatada.substring(0, 18), bgColor);

            y += rowHeight;

            if (y > 700) {
                doc.addPage();
                y = 50;
            }
        });

        if (logs.length > 25) {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(this.COLORS.lightText)
                .text(`... e mais ${logs.length - 25} registros`);
        }

        doc.moveDown(0.5);
    }

    /**
     * Desenhar célula de tabela
     */
    static desenharCelulaTabela(doc, x, y, width, height, texto, bgColor) {
        // Fundo
        doc.rect(x, y, width, height).fillAndStroke(bgColor, this.COLORS.border);
        
        // Texto
        doc.fontSize(9).font('Helvetica').fillColor(this.COLORS.text);
        doc.text(texto, x + 5, y + 6, { width: width - 10, height: height - 12, ellipsis: true });
    }

    /**
     * Adicionar rodapé
     */
    static adicionarRodape(doc) {
        const pageHeight = doc.page.height;
        const footerY = pageHeight - 40;

        // Linha separadora
        doc.moveTo(50, footerY).lineTo(545, footerY).stroke(this.COLORS.border);

        // Texto do rodapé
        doc.fontSize(9).font('Helvetica').fillColor(this.COLORS.lightText);
        doc.text('Sistema de Gestão Estratégica - SGE PCI/RN', 50, footerY + 10, { align: 'left' });
        doc.text(`Página ${doc.bufferedPageRange().count}`, 500, footerY + 10, { align: 'right' });
        doc.text('© Polícia Científica do Rio Grande do Norte', 50, footerY + 25, { align: 'center', width: 500 });
    }
}

module.exports = PDFGenerator;
