# Validação do cadastro da estrutura organizacional

## Fonte e escopo

O cadastro foi realizado a partir do documento hierárquico anexado ao projeto, usando a tabela canônica `organizational_units_v2`. Nenhuma regra de acesso, módulo, usuário, processo ou permissão foi alterada.

Foram criadas as migrations [0021_official_organizational_structure.sql](./database/migrations/0021_official_organizational_structure.sql) e [0022_official_regional_units.sql](./database/migrations/0022_official_regional_units.sql), que:

- adiciona sigla, código hierárquico, nível, descrição e status à estrutura canônica;
- cadastra a raiz `Polícia Científica do Rio Grande do Norte`;
- cadastra todas as entradas hierárquicas do documento;
- mantém a relação de subordinação por `parent_id`;
- cria índices para código hierárquico e sigla;
- é idempotente e pode ser reaplicada com segurança.
- cadastra as sedes regionais de Natal, Pau dos Ferros, Mossoró e Caicó.

## Quantidades

- Unidades oficiais cadastradas: **182**
- Entradas do documento: **177**
- Raiz institucional adicionada para representar o órgão superior solicitado: **1**
- Sedes regionais adicionadas: **4**
- Unidades órfãs: **0**
- Raízes da árvore: **1**
- Siglas duplicadas no cadastro oficial: **0**

### Quantidade por nível hierárquico

| Nível | Quantidade |
|---:|---:|
| 1 | 1 |
| 2 | 6 |
| 3 | 27 |
| 4 | 42 |
| 5 | 59 |
| 6 | 46 |
| 7 | 1 |

## Unidades principais

- Polícia Científica do Rio Grande do Norte (`PCIRN`)
- Corregedor-Geral da Polícia Científica do Rio Grande do Norte (`CGPCI`)
- Diretoria-Geral (`DG`)
- Regional Natal
- Regional Pau dos Ferros
- Regional Mossoró
- Regional Caicó
- Instituto de Criminalística (`IC`)
- Instituto de Identificação (`II`)
- Instituto de Medicina Legal (`IML`)
- Subcoordenações, núcleos, setores, laboratórios, serviços, comissões e demais unidades constantes do documento.

## Visualização em árvore

A validação hierárquica está disponível na API existente:

```text
GET /api/organization/tree
```

O endpoint retorna `parent_id`, `codigo_hierarquico`, `nivel_hierarquico`, `sigla`, `tipo`, `status` e `children`, permitindo navegar a árvore completa sem criar uma nova funcionalidade de acesso.

Também foi criada a view PostgreSQL `organizational_structure_validation`, que permite conferir a unidade superior válida de cada registro.

## Vínculo de usuários e escopo

Na criação de usuários administrativos, o campo **Unidade organizacional de pertencimento** usa a árvore oficial e grava o UUID exato em `users.organizational_unit_id`. O caminho completo da unidade é exibido para evitar a seleção acidental de uma unidade superior.

O escopo de processos continua sendo calculado pelo middleware existente: o usuário acessa processos da unidade escolhida e de suas unidades descendentes ativas, sem acessar unidades irmãs ou superiores fora do escopo. Usuários globais (`NGE`) permanecem sem limitação por unidade.

## Divergências e observações

1. O documento possui duas entradas sem descrição após a sigla: `CG` e `SG`. Elas foram cadastradas com a própria sigla como nome, sem inventar nomenclatura ausente na fonte.
2. O documento começa numerado em `1. CGPCI` e `2. DG`, mas o requisito também determina o órgão superior `Polícia Científica do Rio Grande do Norte`. Por isso, a raiz `PCIRN` foi adicionada como nível superior, e `CGPCI` e `DG` foram vinculados a ela.
3. A tabela existente não possuía todos os tipos necessários. A migration ampliou o domínio de `tipo` para representar os níveis encontrados, preservando os registros existentes.
4. A classificação do tipo foi derivada da nomenclatura oficial de cada unidade. Nomes, siglas e códigos hierárquicos foram preservados conforme a fonte.

## Resultado

**CADASTRO VALIDADO: SIM**

- Todos os registros possuem código hierárquico.
- Todos os registros, exceto a raiz, possuem unidade superior.
- Não foram identificadas unidades órfãs.
- A árvore pode ser consultada pelo endpoint existente e pela view de validação.
