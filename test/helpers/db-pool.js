// ============================================================================
// Test Helper - Lazy Load DB Pool
// Evita serialização de Pool ao usar node:test workers
// ============================================================================

let poolInstance = null;

/**
 * Obter pool de banco de dados (lazy load)
 * Não requer pool no escopo global do módulo
 */
async function getPool() {
    if (!poolInstance) {
        poolInstance = await require('../../src/models/db');
    }
    return poolInstance;
}

/**
 * Resetar pool (para isolamento de testes)
 */
function resetPool() {
    poolInstance = null;
    // Limpar cache
    delete global.__PG_MEM_DB;
    delete global.__PG_MEM_POOL;
}

module.exports = {
    getPool,
    resetPool
};
