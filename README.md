# Drenagem Inteligente Pádua

PROMPT TÉCNICO COMPLETO — DRENAGEM INTELIGENTE PÁDUA

Plataforma de inteligência geográfica, hidrológica e hidráulica para drenagem urbana

Desenvolva no Lovable um sistema web profissional chamado Drenagem Inteligente Pádua, destinado exclusivamente à equipe técnica responsável pelo planejamento, diagnóstico e avaliação de soluções de drenagem urbana no município de Santo Antônio de Pádua, Rio de Janeiro, Brasil.

O sistema deverá ajudar a identificar áreas de alagamento, organizar informações geográficas, analisar o relevo, cadastrar redes de drenagem, calcular parâmetros hidráulicos e planejar simulações de chuvas intensas e cheias do Rio Pomba.

O objetivo é apoiar decisões técnicas e comparar alternativas de intervenção, fornecendo informações rastreáveis e relatórios que possam subsidiar estudos de engenharia e planejamento de obras públicas.

REGRA FUNDAMENTAL: o aplicativo deverá distinguir claramente dados observados, dados importados, estimativas automáticas, cálculos preliminares, resultados de simulações efetivamente executadas e projetos formalmente aprovados por profissional habilitado. Nunca deverá inventar medições, resultados hidráulicos, cotas altimétricas ou aprovações profissionais.

---

1. IDENTIDADE E OBJETIVOS DO SISTEMA

Nome: Drenagem Inteligente Pádua.

Município de referência: Santo Antônio de Pádua — RJ.

Idioma: português brasileiro.

Unidades: sistema métrico, com cotas e comprimentos em metros, diâmetros em milímetros ou metros, vazões em m³/s, chuva em mm, áreas em hectares ou km², velocidade em m/s, declividade em porcentagem e ângulo em graus.

Público: equipe técnica de engenharia, profissionais de geoprocessamento, técnicos de campo, gestores autorizados e revisores técnicos.

Acesso: restrito a usuários autenticados e autorizados.

Objetivos principais:

1. Identificar e mapear pontos de alagamento em diferentes bairros.
2. Organizar dados de relevo, rios, bacias de contribuição e infraestrutura pluvial.
3. Cadastrar galerias, manilhas, bueiros, caixas coletoras, poços de visita, sarjetas, canais, comportas e pontos de lançamento.
4. Integrar bases cartográficas e hidrológicas públicas.
5. Calcular diferenças de cotas, comprimentos, declividades, vazões e capacidade hidráulica, conforme os dados disponíveis.
6. Planejar e executar simulações de drenagem urbana e de níveis elevados do Rio Pomba.
7. Comparar alternativas de intervenção.
8. Identificar limitações, riscos de represamento e possibilidade de retorno da água do rio.
9. Produzir relatórios técnicos preliminares e documentos para revisão profissional.
10. Manter histórico completo das medições, cálculos, simulações, alterações e aprovações.

O sistema não deverá prometer eliminar todos os alagamentos. Sua finalidade é apoiar o diagnóstico, a priorização e o planejamento de soluções tecnicamente verificáveis.

2. ARQUITETURA TÉCNICA

Construa uma aplicação web responsiva, utilizável em computadores, tablets e celulares.

Utilize a seguinte arquitetura:

Frontend

- Lovable com React e TypeScript.
- Interface organizada em módulos.
- Componentes reutilizáveis.
- Formulários com validação de dados.
- Gráficos, tabelas, mapas e painéis de resultados.
- Estados de carregamento, erro, ausência de dados e processamento.
- Interface acessível e adequada para uso técnico.

Backend e banco de dados

- Supabase para autenticação, banco de dados, armazenamento de documentos e funções de servidor.
- PostgreSQL com PostGIS para dados espaciais.
- Row Level Security (RLS) em todas as tabelas com dados protegidos.
- Funções de servidor para operações que exijam privilégios controlados.
- Registro de auditoria e versionamento dos dados técnicos.

Mapas

- Leaflet ou MapLibre para exibição cartográfica.
- Camadas vetoriais e raster.
- Suporte a GeoJSON, GeoPackage por meio de processo de importação no servidor, CSV georreferenciado, GeoTIFF e arquivos de levantamento compatíveis.
- Coordenadas geográficas e sistemas projetados, com transformação explícita entre referências cartográficas.
- Utilização de SIRGAS 2000 e do sistema de coordenadas projetadas adequado à área, como UTM zona 23S quando aplicável.
- Nunca misturar coordenadas de sistemas diferentes sem transformação documentada.

Processamento geoespacial

- Planejar integração com ferramentas GIS, preferencialmente QGIS e bibliotecas geoespaciais apropriadas.
- Executar tarefas pesadas em serviços de processamento no servidor, não diretamente na interface.
- Não simular processamento geográfico apenas exibindo mapas ou valores fixos.

Motor de cálculos e simulações

- Criar um módulo independente para cálculos determinísticos.
- Preparar integração com ferramentas reconhecidas de modelagem hidrológica e hidráulica, como EPA SWMM e HEC-RAS, conforme o tipo de estudo.
- Utilizar serviços de processamento isolados, com fila de execução, registros de entrada, logs, resultados e controle de falhas.
- A interface não deverá declarar uma simulação concluída se o motor correspondente não tiver sido executado com sucesso.

A chave de serviço do Supabase, credenciais e segredos de APIs nunca devem ficar expostos no frontend.

3. MÓDULO DE AUTENTICAÇÃO E PERMISSÕES

Criar acesso por e-mail e senha, com recuperação de senha e controle de sessão.

Implementar os seguintes perfis:

Administrador do sistema

- Gerenciar usuários e permissões.
- Configurar integrações.
- Gerenciar parâmetros gerais.
- Consultar auditorias e logs.
- Administrar cadastros e dados importados.

Engenheiro responsável

- Criar e revisar estudos.
- Configurar cenários hidráulicos.
- Consultar e validar cálculos.
- Registrar pareceres técnicos.
- Aprovar ou rejeitar resultados e documentos dentro de sua competência.
- Registrar identificação profissional e número de CREA, quando aplicável.

Técnico de engenharia

- Cadastrar pontos críticos.
- Inserir medições.
- Atualizar redes de drenagem.
- Executar operações autorizadas.
- Gerar relatórios preliminares.
- Não aprovar definitivamente projetos sem a permissão correspondente.

Analista GIS

- Importar e organizar camadas geográficas.
- Corrigir geometrias.
- Configurar sistemas de referência.
- Documentar a origem e a qualidade dos dados.

Consulta técnica

- Visualizar mapas, estudos e relatórios autorizados.
- Não alterar dados ou aprovar documentos.

Aplicar o princípio do menor privilégio. Nenhum usuário poderá conceder a si próprio permissões de aprovação.

4. PAINEL PRINCIPAL

Criar um dashboard com:

- Mapa geral de Santo Antônio de Pádua.
- Quantidade de pontos de alagamento cadastrados.
- Ocorrências por bairro e região.
- Pontos críticos ainda sem vistoria.
- Estudos em andamento.
- Simulações concluídas, falhas e pendentes.
- Trechos de drenagem cadastrados.
- Trechos com dados topográficos incompletos.
- Pontos com possibilidade de influência do nível do rio.
- Estudos aguardando revisão do engenheiro.
- Relatórios aprovados, rejeitados e preliminares.
- Última atualização de cada fonte de dados.
- Alertas sobre informações antigas, incompletas ou incompatíveis.

Os indicadores deverão refletir dados reais do banco. Não utilizar números fictícios para preencher o dashboard.

Quando não existirem registros, mostrar zero ou uma mensagem explicativa.

5. MÓDULO DE MAPA GEOGRÁFICO

Construir um mapa interativo do município com camadas independentes, ativáveis e desativáveis.

Incluir:

1. Limite municipal.
2. Bairros e localidades, quando houver dados confiáveis.
3. Ruas e vias.
4. Rios, córregos e cursos d'água.
5. Modelo digital de elevação.
6. Curvas de nível, quando disponíveis.
7. Direções prováveis de escoamento superficial.
8. Áreas de contribuição das bacias urbanas.
9. Pontos de alagamento.
10. Registros de inundações históricas.
11. Bocas de lobo e caixas coletoras.
12. Poços de visita.
13. Manilhas e galerias pluviais.
14. Canais e bueiros.
15. Pontos de lançamento no rio.
16. Estações hidrológicas disponíveis.
17. Áreas de risco e suscetibilidade.
18. Locais de obras existentes ou planejadas.
19. Áreas de armazenamento ou retenção, quando cadastradas.

Cada elemento deverá ter identificação, coordenadas, fonte, data, qualidade dos dados e nível de confiança.

Ao clicar em um ponto, abrir uma ficha contendo seus dados, fotografias, medições, documentos, ocorrências associadas e histórico de alterações.

Permitir busca por rua, bairro, identificador e coordenadas.

Permitir medir distâncias e consultar coordenadas, informando claramente a precisão disponível.

O sistema deverá diferenciar graficamente:

- Dado confirmado em campo.
- Dado importado de fonte pública.
- Estimativa derivada de modelo geográfico.
- Informação pendente de verificação.

Não representar um modelo de elevação de baixa resolução como levantamento topográfico de precisão.

6. IMPORTAÇÃO DE DADOS PÚBLICOS

Criar um módulo chamado “Central de Dados Geográficos”.

Preparar integração e importação das seguintes fontes:

Serviço Geológico do Brasil — SGB/CPRM

- Carta de suscetibilidade a movimentos gravitacionais de massa e inundações, conforme os produtos disponíveis para o município.
- Estudos de inundação do Rio Pomba.
- Bases cartográficas e modelos de elevação associados aos estudos.
- Relatórios e mapas históricos.

Referências:
https://rigeo.sgb.gov.br/

IBGE

- Limites municipais.
- Base cartográfica.
- Informações territoriais e geodésicas.
- Dados auxiliares de localidades e setores, conforme disponibilidade.

Referência:
https://www.ibge.gov.br/geociencias/

INPE — TOPODATA

- Modelo digital de elevação.
- Produtos derivados de relevo, conforme disponibilidade.

Referência:
https://www.dsr.inpe.br/topodata/

ANA — HidroWeb e SNIRH

- Estações hidrológicas.
- Séries de nível e vazão.
- Dados históricos e metadados das estações disponíveis.

Referência:
https://www.snirh.gov.br/hidroweb/

INEA — RJ

- Informações de monitoramento hidrológico.
- Dados estaduais de recursos hídricos.
- Alertas e produtos disponíveis para a região.

Referência:
https://www.inea.rj.gov.br/

Prefeitura de Santo Antônio de Pádua

- Plano Municipal de Saneamento Básico.
- Diagnósticos e prognósticos de drenagem.
- Plantas de galerias existentes.
- Projetos de engenharia.
- Cadastro de obras.
- Dados de ocorrências de alagamento.
- Levantamentos topográficos disponíveis.

Referência:
https://santoantoniodepadua.rj.gov.br/conteudo/18/plano_municipal_de_saneamento_basico

Para cada fonte, registrar:

- Nome e instituição.
- URL ou identificação do arquivo.
- Data de publicação.
- Data de importação.
- Escala e resolução.
- Sistema de coordenadas.
- Unidade de medida.
- Precisão declarada, quando conhecida.
- Licença e condições de uso.
- Cobertura geográfica.
- Limitações conhecidas.

Não presumir que todos os dados estejam disponíveis por API. Permitir importação manual de arquivos oficiais quando não houver integração automatizada.

Não criar estações, leituras, cotas ou séries históricas fictícias.

Quando uma fonte estiver indisponível, mostrar o erro e permitir nova tentativa ou importação manual.

7. CADASTRO DE PONTOS DE ALAGAMENTO

Criar um formulário completo com:

- Código único da ocorrência.
- Endereço.
- Bairro ou localidade.
- Coordenadas.
- Data e hora.
- Responsável pelo registro.
- Fotografias e vídeos.
- Profundidade observada da água.
- Extensão aproximada da área alagada.
- Duração do evento.
- Frequência relatada.
- Condições meteorológicas.
- Intensidade de chuva observada, quando disponível.
- Condição do Rio Pomba ou do curso d'água próximo.
- Existência de bueiros, galerias e canais.
- Possíveis obstruções.
- Histórico de ocorrências anteriores.
- Danos observados.
- Interferências no trânsito.
- Hipótese inicial da causa.
- Necessidade de vistoria.
- Situação do diagnóstico.
- Grau de confiança dos dados.

Permitir cadastrar vários pontos, vincular ocorrências recorrentes e anexar documentos.

A causa do alagamento deverá ser marcada como hipótese até ser confirmada pela investigação técnica.

Permitir gerar ficha de vistoria para impressão.

8. CADASTRO DA INFRAESTRUTURA DE DRENAGEM

Criar um cadastro georreferenciado para:

Manilhas e galerias

- Código do trecho.
- Coordenadas inicial e final.
- Comprimento medido.
- Material.
- Diâmetro interno.
- Formato da seção.
- Cota de fundo a montante.
- Cota de fundo a jusante.
- Declividade.
- Estado de conservação.
- Capacidade calculada, quando possível.
- Fonte de cada medida.
- Data da inspeção.
- Situação operacional.

Caixas coletoras e poços de visita

- Identificação.
- Localização.
- Cota da tampa.
- Cota de fundo.
- Dimensões.
- Conexões.
- Condições de acesso.
- Estado de conservação.
- Fotografias.

Canais, bueiros e pontos de lançamento

- Geometria.
- Material.
- Seção.
- Cotas.
- Condição de saída.
- Condição de submersão.
- Ligação com outros elementos.
- Histórico de inspeção.

Dispositivos de proteção

- Válvulas antirretorno.
- Comportas.
- Bombas.
- Reservatórios.
- Estruturas de dissipação.
- Outros dispositivos efetivamente cadastrados.

Não presumir a existência de uma estrutura somente porque ela aparece em um mapa ou fotografia.

Criar um grafo da rede, representando os elementos e suas conexões. Detectar possíveis trechos desconectados, cotas ausentes, comprimentos incompatíveis e sentidos de fluxo inconsistentes.

9. MÓDULO DE RELEVO E LEVANTAMENTO TOPOGRÁFICO

Permitir importar modelos digitais de elevação e arquivos de levantamento de campo.

Exibir:

- Altitude estimada.
- Curvas de nível.
- Perfis longitudinais.
- Perfis transversais.
- Diferenças de cotas.
- Direção de escoamento superficial estimada.
- Declividades do terreno.
- Pontos baixos.
- Áreas de contribuição preliminares.
- Perfis das tubulações cadastradas.

Criar um perfil longitudinal de cada trecho de drenagem, com representação das cotas do terreno, do fundo da tubulação e do nível d'água, quando os dados existirem.

Exigir que as cotas sejam associadas à sua referência altimétrica e método de obtenção.

Permitir registrar:

- Estação total.
- GNSS de precisão adequada.
- Nivelamento geométrico.
- Levantamento por outro método documentado.

Não tratar GPS comum de celular como equipamento suficiente para estabelecer cotas precisas de fundo de galeria.

Caso as cotas sejam obtidas apenas por modelo digital de elevação, identificar o resultado como estimativa preliminar.

10. CALCULADORA DE DECLIVIDADE E GEOMETRIA

Implementar cálculos verificáveis, com fórmulas, unidades, valores de entrada e resultados visíveis.

Declividade percentual

Declividade = (cota inicial − cota final) / comprimento horizontal × 100.

Ângulo da inclinação

Ângulo = arctan((cota inicial − cota final) / comprimento horizontal).

Diferença de cota

Diferença de cota = cota inicial − cota final.

Comprimento do trecho

Utilizar o comprimento horizontal do eixo da tubulação, com método de medição identificado.

Apresentar:

- Cota inicial.
- Cota final.
- Comprimento.
- Diferença de cota.
- Declividade percentual.
- Ângulo em graus.
- Sentido geométrico.
- Incerteza das medidas, quando conhecida.
- Fonte das cotas.

Validar entradas nulas, unidades incompatíveis, comprimentos inválidos e cotas sem referência conhecida.

Não confundir ângulo geométrico com garantia de escoamento hidráulico.

Não afirmar que uma inclinação é adequada sem verificar as condições hidráulicas, construtivas e normativas pertinentes.

11. MÓDULO DE HIDROLOGIA

Criar um módulo para caracterizar as chuvas e estimar a vazão de projeto.

Permitir cadastrar:

- Área da bacia contribuinte.
- Tipo e uso do solo.
- Percentual de impermeabilização.
- Comprimento do caminho hidráulico.
- Declividade média.
- Dados de chuva observados.
- Curvas intensidade-duração-frequência, quando disponíveis e apropriadas.
- Tempo de concentração.
- Período de retorno definido pelo responsável técnico.
- Distribuição temporal da chuva.
- Condições antecedentes de umidade, quando aplicáveis.

Implementar métodos hidrológicos documentados e adequados ao tamanho e à complexidade da bacia.

Permitir método racional para situações em que suas hipóteses sejam válidas e o método seja aceito pelo responsável técnico.

Para análises mais completas, preparar integração com o EPA SWMM, incluindo simulação de chuva, infiltração, escoamento superficial, armazenamento e contribuição das sub-bacias.

Não inventar curvas IDF, períodos de retorno ou parâmetros de infiltração.

Quando não houver dados suficientes, apresentar os parâmetros faltantes e impedir que o resultado seja classificado como dimensionamento definitivo.

Exibir os resultados com hipóteses, equações, unidades, fontes e limitações.

12. MÓDULO DE DIMENSIONAMENTO HIDRÁULICO

Criar uma calculadora técnica para avaliar trechos de drenagem.

Permitir informar:

- Vazão de projeto.
- Diâmetro interno.
- Material e rugosidade.
- Comprimento.
- Declividade.
- Geometria da seção.
- Condições de entrada e saída.
- Níveis de montante e jusante.
- Condição de funcionamento: parcialmente cheio, cheio ou sob pressão, quando aplicável.
- Perdas de carga localizadas.
- Condição de submersão da saída.

Implementar equações reconhecidas e documentadas, como a equação de Manning para condições de escoamento compatíveis com suas hipóteses.

Para seção circular, calcular geometria hidráulica, área molhada, perímetro molhado, raio hidráulico e velocidade, conforme o nível de enchimento considerado.

Não usar a equação de Manning isoladamente para declarar a capacidade de uma tubulação em qualquer condição. Considerar o controle de entrada, controle de saída, perdas de carga, afogamento e condições de contorno.

O resultado deverá incluir:

- Vazão calculada.
- Velocidade calculada.
- Declividade.
- Diâmetro analisado.
- Nível de enchimento, quando aplicável.
- Perdas de carga consideradas.
- Condição de montante e jusante.
- Limitações.
- Referência metodológica.
- Data e responsável pelo cálculo.

Permitir comparar alternativas de diâmetro e declividade sem apresentar automaticamente uma alternativa como aprovada.

Exibir alertas para velocidades, enchimentos e condições operacionais que exijam verificação conforme os critérios técnicos definidos pelo engenheiro.

13. MÓDULO DE CHEIAS DO RIO POMBA E RETORNO DA ÁGUA

Criar um módulo específico para avaliar a interação entre a rede urbana de drenagem e o nível do rio.

Permitir cadastrar ou importar séries de níveis d'água, vazões e registros históricos de cheias.

Cada série deverá ter:

- Estação de origem.
- Identificação oficial.
- Coordenadas.
- Datum vertical, quando conhecido.
- Período de observação.
- Intervalo temporal.
- Unidade.
- Data da última atualização.
- Lacunas e qualidade dos dados.

Não misturar nível relativo de uma régua com cota altimétrica sem transformação documentada.

Permitir criar cenários:

1. Nível habitual do rio.
2. Nível elevado.
3. Cheia histórica selecionada.
4. Cenário de projeto definido pelo engenheiro.
5. Cenário hipotético explicitamente identificado como tal.

Avaliar:

- Cota de saída da galeria.
- Nível do rio no ponto de descarga.
- Submersão da saída.
- Possibilidade de redução ou interrupção do escoamento.
- Possibilidade de fluxo reverso.
- Efeito de perdas de carga.
- Influência do nível de jusante sobre a rede.
- Possíveis efeitos de remanso.
- Necessidade de avaliar comportas, válvulas, bombeamento ou armazenamento temporário.

Não concluir que a instalação de uma válvula antirretorno resolverá o alagamento. Considerar que o fechamento do dispositivo pode reter a água pluvial na própria rede.

Quando a análise exigir modelagem hidráulica do rio e de suas margens, preparar integração com ferramenta apropriada, como HEC-RAS, com dados topográficos e condições de contorno compatíveis.

Não afirmar que o sistema prevê com precisão a próxima cheia sem um modelo de previsão validado e dados atuais adequados.

14. MÓDULO DE SIMULAÇÃO HIDRÁULICA

Criar uma central de simulação com cadastro de projetos, cenários, execuções e resultados.

Cada simulação deverá possuir:

- Identificador único.
- Projeto relacionado.
- Área de estudo.
- Objetivo.
- Motor utilizado e versão.
- Modelo de entrada.
- Versão da rede.
- Arquivos de chuva.
- Condições iniciais.
- Condições de contorno.
- Parâmetros físicos.
- Hipóteses.
- Data de execução.
- Responsável.
- Logs.
- Estado de execução.
- Arquivos de resultados.
- Mensagens de erro.
- Revisão técnica.

Estados possíveis:

- Rascunho.
- Aguardando dados.
- Pronta para execução.
- Em processamento.
- Concluída.
- Concluída com alertas.
- Falhou.
- Aguardando revisão.
- Validada tecnicamente.
- Rejeitada.

A simulação somente poderá receber o estado “Concluída” se houver resultado real produzido pelo motor integrado.

Criar uma interface para comparar cenários antes e depois de uma intervenção.

Exibir:

- Vazões.
- Velocidades.
- Níveis d'água.
- Enchimento das galerias.
- Nós sobrecarregados.
- Extravasamentos.
- Duração e volume de alagamento, quando o modelo permitir calcular.
- Sensibilidade a diferentes cenários de chuva.
- Influência de níveis elevados do rio.

Não apresentar resultados simulados como medições reais.

Se o motor hidráulico ainda não estiver integrado, disponibilizar apenas a preparação do cenário e a interface de integração. Exibir “Simulação hidráulica ainda não executada” em vez de gerar mapas ou gráficos fictícios.

15. COMPARADOR DE ALTERNATIVAS DE INTERVENÇÃO

Criar um módulo para comparar diferentes propostas para cada ponto crítico.

Exemplos:

- Readequação de galeria existente.
- Instalação de novo trecho de manilha.
- Alteração do trajeto.
- Implantação de caixas coletoras adicionais.
- Ampliação de bueiro.
- Canalização tecnicamente justificada.
- Bacia de retenção.
- Estruturas de dissipação.
- Proteção contra retorno de água.
- Solução de bombeamento, quando necessária e justificada.

Para cada alternativa, cadastrar:

- Descrição.
- Geometria.
- Dados de projeto.
- Materiais previstos.
- Custo estimado, se houver dados confiáveis.
- Restrições de implantação.
- Interferências conhecidas.
- Resultado da análise hidráulica.
- Limitações.
- Impactos a montante e jusante.
- Necessidade de licenças e autorizações.
- Estado da revisão profissional.

Comparar resultados somente quando os cenários utilizarem condições de entrada compatíveis.

Não recomendar o direcionamento de água ao rio sem verificar os efeitos no ponto de descarga, o risco de erosão, a capacidade do sistema receptor e possíveis impactos a jusante.

Não gerar orçamento preciso sem quantitativos e preços identificados.

16. CONTROLE DE QUALIDADE E CONFIABILIDADE

Criar um módulo chamado “Qualidade dos Dados”.

Verificar automaticamente:

- Cotas ausentes.
- Unidades incompatíveis.
- Sistemas de coordenadas diferentes.
- Geometrias inválidas.
- Trechos desconectados.
- Comprimentos inconsistentes.
- Declividades incompatíveis com as cotas.
- Dados duplicados.
- Séries temporais com lacunas.
- Datas inválidas.
- Fontes desatualizadas.
- Parâmetros hidráulicos não documentados.
- Cenários sem condições de contorno.
- Resultados sem identificação do motor de cálculo.

Classificar a qualidade da informação:

- Confirmada por levantamento.
- Proveniente de fonte oficial.
- Estimada por modelo.
- Informada por terceiro.
- Pendente de validação.

Essa classificação deve descrever a origem da informação, não substituir uma avaliação formal da precisão.

Cada cálculo deverá guardar os valores de entrada e a versão da fórmula ou do método usado, permitindo reproduzir o resultado.

Implementar testes automatizados para fórmulas e casos de referência, com valores esperados conhecidos.

17. RELATÓRIOS TÉCNICOS

Criar relatórios para impressão e exportação em PDF.

Relatório de ocorrência

- Localização.
- Fotografias.
- Descrição do problema.
- Data.
- Profundidade observada.
- Histórico.
- Hipóteses iniciais.
- Pendências de vistoria.

Relatório topográfico

- Coordenadas.
- Referência altimétrica.
- Cotas medidas.
- Método e equipamento.
- Precisão documentada.
- Perfis longitudinais e transversais.
- Data e responsável.

Relatório de galeria

- Planta do trecho.
- Perfil longitudinal.
- Comprimento.
- Diâmetro.
- Material.
- Cotas de fundo.
- Declividade.
- Vazão calculada, se disponível.
- Condições de montante e jusante.

Relatório hidrológico e hidráulico

- Bacia de contribuição.
- Parâmetros da chuva.
- Método.
- Vazões.
- Geometria.
- Condições de contorno.
- Resultados.
- Hipóteses.
- Limitações.
- Referências técnicas.

Relatório de simulação de cheias

- Cenário.
- Dados de nível do rio.
- Modelo utilizado.
- Resultados reais do processamento.
- Mapas e gráficos.
- Áreas afetadas no modelo.
- Limitações.
- Comparação de alternativas.

Relatório de priorização municipal

- Pontos cadastrados.
- Gravidade documentada.
- População ou infraestrutura potencialmente afetada, quando houver dados adequados.
- Frequência dos eventos.
- Condição da infraestrutura.
- Estudos pendentes.
- Prioridade técnica preliminar.
- Justificativa e critérios utilizados.

Todos os documentos deverão apresentar:

- Data de geração.
- Identificação do estudo.
- Fontes.
- Versão dos dados.
- Responsável pela elaboração.
- Estado do documento.
- Identificação do revisor.
- Campo de aprovação, quando aplicável.

Relatórios preliminares devem apresentar a expressão “ESTUDO PRELIMINAR — NÃO UTILIZAR COMO PROJETO EXECUTIVO”.

18. FLUXO OBRIGATÓRIO DE VALIDAÇÃO PROFISSIONAL

Implementar um fluxo formal de revisão.

1. O técnico cadastra os dados.
2. O sistema verifica campos obrigatórios e inconsistências.
3. O motor calcula os parâmetros ou executa a simulação, quando disponível.
4. O sistema gera relatório preliminar.
5. O engenheiro revisa os dados, os métodos, as hipóteses e os resultados.
6. O engenheiro solicita correções, rejeita ou aprova tecnicamente o estudo.
7. A aprovação é registrada com identificação do profissional, data, versão e observações.
8. Qualquer alteração material posterior invalida a aprovação da versão alterada e exige nova revisão.

A aprovação no sistema não substitui a responsabilidade técnica legal, o registro de ART quando aplicável, os projetos complementares, as licenças ou as autorizações necessárias.

O sistema não poderá inventar número de CREA, assinatura, ART ou identidade profissional.

Nenhum estudo incompleto poderá ser apresentado como projeto executivo aprovado.

19. BANCO DE DADOS

Implementar, no mínimo, as seguintes entidades:

- profiles
- roles
- permissions
- projects
- study_areas
- neighborhoods
- flood_events
- flood_observations
- field_inspections
- photographs
- elevation_surveys
- survey_points
- elevation_models
- terrain_profiles
- drainage_assets
- drainage_nodes
- drainage_links
- culverts
- pipes
- inlets
- manholes
- outfalls
- channels
- backflow_devices
- watersheds
- subcatchments
- rainfall_series
- rainfall_events
- hydrological_stations
- river_level_series
- hydraulic_parameters
- calculation_runs
- simulation_scenarios
- simulation_runs
- simulation_results
- alternatives
- technical_reports
- data_sources
- imported_datasets
- quality_checks
- technical_reviews
- approvals
- audit_logs

Utilizar tipos espaciais PostGIS apropriados, índices espaciais e integridade referencial.

Cada entidade geográfica deverá ter sistema de referência identificado e metadados de origem.

Utilizar exclusão lógica para registros técnicos que precisem permanecer no histórico. Proibir exclusão irreversível de resultados aprovados sem procedimento administrativo autorizado.

20. SEGURANÇA, BACKUP E AUDITORIA

Implementar:

- Autenticação segura.
- RLS em todas as tabelas protegidas.
- Validação de permissões no backend.
- Armazenamento privado de documentos técnicos.
- URLs temporárias para acesso a arquivos restritos.
- Registro de operações críticas.
- Histórico de alterações.
- Backup e estratégia de recuperação.
- Proteção contra acessos indevidos.
- Limites de tamanho e validação de arquivos importados.
- Tratamento de falhas.
- Proteção de credenciais.
- Política de retenção de dados.

Registrar quem criou, alterou, importou, calculou, revisou e aprovou cada item.

Não permitir que a interface do navegador determine sozinha se um usuário está autorizado a aprovar ou excluir registros.

21. DESIGN E EXPERIÊNCIA DO USUÁRIO

Adotar aparência profissional, técnica e institucional.

Usar:

- Azul profundo para a identidade visual.
- Tons de azul para rios e camadas hidrográficas.
- Cores de risco com legenda explícita.
- Fundo claro para leitura de mapas e tabelas.
- Tipografia legível.
- Painéis organizados.
- Ícones discretos.
- Tabelas técnicas com unidades.
- Formulários divididos por etapas.
- Filtros avançados.
- Busca global.
- Navegação lateral.
- Botões de ação claramente identificados.

Menu principal:

1. Dashboard.
2. Mapa da cidade.
3. Pontos de alagamento.
4. Vistorias de campo.
5. Infraestrutura de drenagem.
6. Relevo e topografia.
7. Bacias hidrográficas.
8. Hidrologia.
9. Cálculos hidráulicos.
10. Simulações.
11. Comparação de alternativas.
12. Qualidade dos dados.
13. Relatórios.
14. Revisão e aprovação.
15. Central de dados.
16. Administração.

Todas as telas devem ser funcionais, conectadas ao banco e integradas aos respectivos módulos. Não criar apenas telas demonstrativas com botões sem ação.

22. PLANO DE DESENVOLVIMENTO NO LOVABLE

Construir o projeto por fases, sem tentar implementar toda a complexidade hidráulica em uma única etapa.

Fase 1 — Fundação

- Criar a aplicação.
- Implementar autenticação.
- Configurar Supabase.
- Criar banco de dados.
- Aplicar RLS.
- Criar perfis e permissões.
- Criar dashboard inicial.

Fase 2 — Geoprocessamento

- Implementar mapa.
- Criar camadas.
- Importar os dados geográficos disponíveis.
- Criar cadastro de pontos de alagamento.
- Criar cadastro de infraestrutura.
- Criar central de dados e metadados.

Fase 3 — Dados de campo

- Criar fichas de vistoria.
- Registrar fotografias e medições.
- Implementar importação de levantamentos.
- Criar perfis longitudinais.
- Implementar validações geométricas.

Fase 4 — Cálculos

- Criar calculadora de declividade.
- Implementar cálculos geométricos.
- Criar módulo hidrológico.
- Implementar cálculos hidráulicos verificáveis.
- Criar testes automatizados.

Fase 5 — Simulações

- Projetar integração com EPA SWMM.
- Projetar integração com HEC-RAS quando necessária.
- Criar execução de tarefas no servidor.
- Armazenar logs e resultados.
- Implementar cenários de chuva e de nível do rio.
- Comparar alternativas.

Fase 6 — Relatórios e validação

- Gerar PDFs.
- Implementar fluxo de revisão.
- Criar trilha de auditoria.
- Implementar controle de versões.
- Validar permissões.
- Executar testes de aceitação.

Ao concluir cada fase, testar o funcionamento antes de avançar.

23. CRITÉRIOS DE ACEITAÇÃO

O sistema somente será considerado funcional quando:

1. Usuários não autorizados não conseguirem acessar os dados restritos.
2. Os dados persistirem corretamente no banco.
3. Os mapas utilizarem coordenadas e camadas compatíveis.
4. As importações registrarem origem, unidade e sistema de referência.
5. Os cálculos apresentarem fórmulas, entradas e unidades.
6. Os resultados forem reproduzíveis.
7. As simulações forem identificadas como não executadas, em andamento, concluídas ou com falha conforme o estado real do processamento.
8. Nenhum resultado fictício for apresentado como real.
9. Os relatórios apresentarem as limitações e o estado de validação.
10. Alterações em estudos aprovados gerarem nova versão.
11. A aprovação depender de usuário autorizado.
12. O sistema identificar dados insuficientes para dimensionamento.
13. Os resultados forem comparados com casos de referência e revisados pela equipe de engenharia.
14. A interface funcionar em celular e computador.
15. O sistema permitir exportar os documentos técnicos autorizados.

24. INSTRUÇÃO FINAL AO LOVABLE

Comece pela arquitetura, pelo banco de dados e pela primeira versão funcional. Não tente simular resultados hidráulicos antes de implementar ou integrar um motor real de cálculo.

Apresente um plano de implementação e construa cada módulo progressivamente. Informe claramente quais funcionalidades estão concluídas, quais estão parcialmente implementadas e quais dependem de integrações externas.

Não invente dados do município. Não preencha o mapa com galerias fictícias. Não apresente cotas estimadas como medições de campo. Não afirme que o aplicativo prevê cheias com precisão sem dados e modelos adequados. Não aprove projetos automaticamente.

O resultado pretendido é uma plataforma técnica confiável para apoiar o planejamento da drenagem urbana de Santo Antônio de Pádua, com possibilidade de expansão futura para outros municípios.

Prioridade máxima: qualidade dos dados, transparência dos cálculos, integração geográfica, simulação hidráulica verificável, rastreabilidade e validação obrigatória por profissional habilitado.

Ao finalizar a primeira fase, apresente a estrutura do banco de dados, as telas funcionais, as permissões configuradas, as integrações realizadas e uma lista das próximas etapas necessárias para implementar os cálculos e as simulações avançadas.

25. MÓDULO DE PREVISÃO DO TEMPO, ALERTAS METEOROLÓGICOS E RISCO DE ALAGAMENTO



Implementar no Drenagem Inteligente Pádua um módulo completo de monitoramento meteorológico e emissão de alertas preventivos, integrado ao mapa de Santo Antônio de Pádua — RJ, aos pontos de alagamento cadastrados, à rede de drenagem e às simulações de cheias do Rio Pomba.



O módulo deverá permitir que a equipe técnica acompanhe as condições meteorológicas atuais, consulte previsões para as próximas horas e dias, identifique condições potencialmente críticas e receba notificações quando houver possibilidade de chuvas intensas ou aumento do risco de alagamento.



REGRA FUNDAMENTAL: não afirmar que ocorrerá um alagamento apenas porque há previsão de chuva. O risco deverá ser estimado com base nos dados disponíveis, nos critérios definidos pela equipe técnica e nas limitações de cada fonte. Não inventar previsões, precipitações, níveis de rios ou alertas oficiais.



25.1. Painel meteorológico



Criar uma tela chamada “Previsão do Tempo e Alertas”, com:



- Condições meteorológicas atuais para Santo Antônio de Pádua.

- Temperatura atual e prevista.

- Probabilidade de chuva.

- Precipitação prevista em milímetros.

- Intensidade de chuva prevista, quando fornecida pela fonte.

- Previsão horária para as próximas 24 a 72 horas, conforme disponibilidade.

- Previsão diária para os próximos 7 a 10 dias, conforme disponibilidade.

- Horários previstos para início e término da chuva, quando fornecidos.

- Alertas de tempestades, raios, ventos fortes e outros fenômenos, quando disponíveis.

- Horário da última atualização.

- Fonte meteorológica utilizada.

- Indicador de confiabilidade e limitações da previsão.

- Histórico recente de precipitação observada, quando disponível.



Exibir gráficos de chuva prevista por hora, acumulados de precipitação e comparação entre chuva prevista e observada.



Não confundir probabilidade de chuva com volume de precipitação. Mostrar essas informações em campos separados.



Quando a fonte não fornecer um determinado dado, exibir “Não disponível”, sem preencher valores inventados.



25.2. Integração com fontes meteorológicas



Preparar a integração com fontes meteorológicas públicas e serviços que disponibilizem dados para o município.



Priorizar:



1. INMET — Instituto Nacional de Meteorologia: previsões, observações e avisos meteorológicos disponíveis para a região.

2. CEMADEN — Centro Nacional de Monitoramento e Alertas de Desastres Naturais: informações e alertas de risco disponíveis para a área de interesse.

3. Defesa Civil e órgãos estaduais: avisos oficiais e informações de emergência, conforme os canais disponíveis.

4. Open-Meteo ou serviço equivalente: previsão horária, precipitação prevista e variáveis meteorológicas para as coordenadas do município, observadas as condições de uso e os limites do serviço.

5. Estações pluviométricas e hidrológicas: séries observadas e dados históricos disponíveis na ANA, no INEA e em outras fontes oficiais.



Referências iniciais:



- INMET: https://portal.inmet.gov.br/

- CEMADEN: https://www.gov.br/cemaden/pt-br

- Defesa Civil Nacional: https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil

- Open-Meteo: https://open-meteo.com/

- ANA/HidroWeb: https://www.snirh.gov.br/hidroweb/



Verificar a disponibilidade real de cada serviço, os endpoints, a autenticação exigida, os limites de requisições, a licença e a frequência de atualização antes de implementar a integração.



Não presumir que todos os serviços oferecem API pública para todas as variáveis.



Criar uma camada de integração no backend, com tratamento de erros, cache controlado, registro da origem e data de cada consulta. Não expor chaves privadas no frontend.



Se uma fonte estiver indisponível, informar que os dados estão temporariamente indisponíveis e tentar novamente conforme a política configurada.



Não tratar uma previsão meteorológica como medição observada, nem um alerta interno do aplicativo como alerta oficial da Defesa Civil.



25.3. Mapa meteorológico de risco



Integrar a previsão do tempo ao mapa geográfico já existente.



Permitir visualizar:



- Distribuição espacial da chuva prevista, quando houver dados espaciais apropriados.

- Pontos críticos de alagamento.

- Bairros com ocorrências históricas.

- Áreas baixas identificadas por dados topográficos.

- Bacias de contribuição urbanas.

- Galerias e canais cadastrados.

- Estações pluviométricas e hidrológicas.

- Níveis do Rio Pomba, quando disponíveis.

- Áreas de inundação modeladas, quando houver estudo hidráulico válido.

- Alertas meteorológicos oficiais.



Cada camada deverá indicar a origem, a data, o período de validade e a resolução dos dados.



Não transformar automaticamente a previsão de uma estação meteorológica ou de um único ponto em uma estimativa precisa para todos os bairros.



Quando não houver dados meteorológicos espacializados suficientes, exibir a previsão municipal ou regional com sua área de representatividade claramente identificada.



25.4. Motor de avaliação do risco de alagamento



Criar um motor de avaliação preventiva que combine os seguintes fatores:



- Precipitação prevista por hora.

- Acumulado de chuva previsto em diferentes janelas temporais.

- Precipitação observada recente.

- Intensidade de chuva, quando disponível.

- Histórico de alagamentos por local.

- Suscetibilidade topográfica.

- Capacidade conhecida da rede de drenagem.

- Estado de conservação e obstruções registradas.

- Nível observado e previsto do Rio Pomba, quando houver dados adequados.

- Condição de submersão dos pontos de descarga.

- Resultados de simulações hidráulicas efetivamente executadas.

- Avisos oficiais de órgãos competentes.



O motor deverá permitir que a equipe de engenharia configure os critérios de risco com base em estudos locais, dados históricos e procedimentos técnicos aprovados.



Criar quatro categorias operacionais internas:



Nível 1 — Monitoramento

Condições meteorológicas que justificam acompanhamento preventivo.



Nível 2 — Atenção

Condições que ultrapassam os critérios internos de atenção definidos pela equipe técnica.



Nível 3 — Risco elevado

Combinação de fatores meteorológicos e locais que justifica inspeção, preparação de equipes ou outras medidas preventivas previamente estabelecidas.



Nível 4 — Situação crítica

Condição que exige avaliação imediata da equipe responsável, especialmente quando há avisos oficiais, elevação significativa do rio, alagamentos observados ou resultados de modelos que indiquem risco relevante.



Esses níveis são categorias operacionais do aplicativo, não classificações oficiais automáticas da Defesa Civil.



Os limites de chuva, acumulados, níveis do rio e demais critérios deverão ser configuráveis e documentados. Não utilizar limites arbitrários como se fossem valores tecnicamente validados para Santo Antônio de Pádua.



Quando não houver dados suficientes, exibir “Risco não calculável com os dados disponíveis”, informando quais informações faltam.



Não gerar um percentual de probabilidade de alagamento sem um modelo estatístico ou físico validado para essa finalidade.



Se for utilizado um índice interno de risco, informar que se trata de um índice de triagem, e não de uma probabilidade real de ocorrência.



25.5. Previsão específica por ponto de alagamento



Cada ocorrência cadastrada deverá possuir uma ficha de monitoramento meteorológico.



Exibir:



- Previsão de chuva para a localização.

- Chuva observada recente, quando disponível.

- Acumulados previstos para períodos configuráveis.

- Histórico de ocorrências no local.

- Condições de drenagem conhecidas.

- Nível do rio relevante para aquele ponto, se aplicável.

- Último alerta recebido.

- Categoria atual de monitoramento.

- Motivos que contribuíram para o alerta.

- Dados faltantes.

- Recomendações operacionais previamente aprovadas.



O sistema deverá destacar pontos onde a previsão de chuva coincide com histórico recorrente de alagamentos, sem afirmar que a ocorrência será inevitável.



Permitir filtrar os pontos por bairro, categoria de risco, horário previsto, situação da rede e existência de dados suficientes.



25.6. Monitoramento do Rio Pomba



Criar uma seção dedicada à influência do nível do rio sobre a drenagem urbana.



Permitir consultar, quando disponíveis:



- Nível atual observado.

- Série histórica.

- Tendência recente de elevação ou redução.

- Vazão observada.

- Previsões ou projeções oficiais disponíveis.

- Avisos de cheia.

- Nível de referência para atenção.

- Nível de referência para condição crítica, quando definido tecnicamente.

- Relação entre o nível do rio e as cotas dos pontos de lançamento cadastrados.



Diferenciar claramente:



- Nível observado.

- Previsão de nível.

- Cota altimétrica.

- Altura relativa a uma régua.

- Limite operacional definido pela equipe técnica.



Não converter alturas de régua em cotas altimétricas sem referência e transformação documentadas.



Não afirmar que o rio irá subir ou atingir determinada cota sem dados e método apropriados.



Quando o nível do rio estiver alto, avaliar a possibilidade de redução da capacidade de descarga das galerias e de retorno da água, desde que a geometria e as condições hidráulicas sejam conhecidas.



25.7. Sistema de notificações automáticas



Criar um módulo de notificações que possa avisar a equipe técnica sobre condições meteorológicas e hidrológicas relevantes.



Implementar uma central de notificações dentro do aplicativo e preparar suporte para:



- Notificações push em navegadores e dispositivos compatíveis.

- E-mail.

- WhatsApp por integração oficial autorizada, quando configurada.

- Alertas internos no painel.

- Relatórios periódicos para usuários autorizados.



As integrações externas deverão ser configuradas com credenciais seguras. Não afirmar que mensagens foram enviadas se o provedor não confirmar a operação.



Permitir configurar os destinatários por função, equipe, bairro ou área de responsabilidade.



Cada notificação deverá conter:



- Identificador do alerta.

- Data e hora de geração.

- Local ou área afetada.

- Categoria do alerta.

- Previsão ou condição observada que o motivou.

- Janela temporal relevante.

- Fonte dos dados.

- Horário da última atualização.

- Fatores locais considerados.

- Nível de confiança ou limitações.

- Ação recomendada, quando houver procedimento aprovado.

- Link para abrir o ponto ou mapa correspondente.

- Situação de entrega e confirmação de leitura, quando suportadas.



25.8. Regras de disparo de notificações



Permitir configurar regras como:



- Previsão de chuva acima de limite técnico definido pela equipe.

- Acumulado de chuva previsto acima de limite configurado.

- Chuva observada acima de critério definido.

- Aviso meteorológico oficial relevante para o município.

- Elevação do nível do rio acima de referência cadastrada.

- Combinação de chuva prevista e histórico de alagamento.

- Combinação de chuva, nível do rio e limitações conhecidas da rede.

- Alteração relevante na categoria interna de risco.

- Falha prolongada na atualização de uma fonte crítica.



Os limites devem ser parametrizados por profissionais autorizados, com registro da justificativa e da data de aprovação.



Implementar:



- Período mínimo entre alertas repetidos.

- Deduplicação de eventos.

- Escalonamento quando o risco aumentar.

- Atualização de alertas ativos.

- Encerramento quando as condições deixarem de justificar o alerta, respeitando as regras definidas.

- Histórico completo das notificações.

- Reenvio controlado em caso de falha.



Não emitir uma nova notificação a cada consulta quando o mesmo evento permanece inalterado.



Não cancelar um alerta oficial com base apenas em uma melhora da previsão automática.



25.9. Recomendações operacionais



Criar uma biblioteca de procedimentos preventivos, aprovada pela equipe responsável.



Conforme o nível de atenção, o sistema poderá sugerir ações como:



- Inspecionar pontos historicamente críticos.

- Verificar obstruções em bocas de lobo e galerias.

- Conferir o funcionamento de bombas e dispositivos de proteção.

- Acompanhar o nível do Rio Pomba.

- Preparar equipes para vistoria.

- Registrar fotografias e condições locais.

- Consultar a Defesa Civil diante de avisos oficiais.

- Atualizar o estado dos pontos alagados.



As sugestões deverão ser adaptadas aos procedimentos aprovados pelo município.



O sistema não deverá determinar automaticamente evacuações, fechamento de vias ou operações de emergência sem autorização e protocolos institucionais adequados.



25.10. Painel de alertas ativos



Criar uma tela com:



- Alertas ativos e recentes.

- Localização.

- Categoria.

- Horário de emissão.

- Previsão de validade.

- Fonte.

- Motivo.

- Equipe responsável.

- Situação do atendimento.

- Confirmação de recebimento.

- Histórico de atualizações.

- Registro de vistoria e encerramento.



Permitir que a equipe marque um alerta como:



- Recebido.

- Em análise.

- Vistoria solicitada.

- Em atendimento.

- Encerrado com justificativa.



O encerramento operacional de um alerta interno não deverá apagar o histórico nem alterar o status de alertas oficiais.



25.11. Validação e qualidade dos alertas



Criar um histórico de desempenho para comparar:



- Chuva prevista versus chuva observada.

- Horário previsto versus horário observado.

- Alertas emitidos versus ocorrências registradas.

- Falsos alarmes identificados após análise.

- Ocorrências sem alerta prévio.

- Dados ausentes ou atrasados.

- Desempenho por fonte meteorológica.

- Desempenho por bairro e tipo de evento, quando houver amostra suficiente.



Não declarar que o sistema prevê alagamentos com precisão sem avaliação retrospectiva e validação técnica.



Permitir que a equipe registre ocorrências reais após cada evento para melhorar gradualmente os critérios de triagem.



Não modificar automaticamente parâmetros críticos sem revisão e aprovação profissional.



25.12. Segurança e disponibilidade



Executar consultas meteorológicas no backend sempre que apropriado.



Implementar cache, controle de frequência de chamadas, monitoramento de falhas e recuperação automática.



Armazenar:



- Dados meteorológicos relevantes.

- Fonte.

- Data de consulta.

- Período de validade.

- Identificador da resposta, quando disponível.

- Estado da integração.

- Histórico de alertas emitidos.



Definir um prazo máximo de validade por tipo de dado. Quando os dados estiverem antigos, apresentar aviso de desatualização e impedir que sejam exibidos como condições atuais.



Se as integrações falharem, manter acessíveis os últimos dados armazenados, claramente identificados como históricos, sem gerar novos alertas que dependam de informações desatualizadas.



25.13. Critérios de aceitação do módulo



Considerar o módulo funcional somente quando:



1. A previsão for obtida de uma fonte real e identificada.

2. Os horários e as unidades estiverem corretos.

3. A atualização e a validade dos dados forem visíveis.

4. O mapa apresentar a área de cobertura e as limitações da previsão.

5. Os critérios de risco forem configuráveis e auditáveis.

6. Os alertas internos forem diferenciados dos avisos oficiais.

7. As notificações forem efetivamente enviadas por integrações configuradas.

8. As falhas de envio e de consulta forem registradas.

9. Os alertas repetidos forem controlados.

10. Os níveis do rio forem apresentados com suas referências e unidades.

11. O sistema não gerar percentuais de probabilidade sem método validado.

12. As previsões e os alertas forem testados com cenários conhecidos.

13. O histórico de notificações puder ser consultado e exportado.

14. A equipe técnica puder revisar e ajustar os critérios de risco.

15. Nenhuma estimativa for apresentada como certeza de ocorrência.



25.14. Instrução final para implementação



Integrar este módulo ao mapa principal, aos pontos críticos de alagamento, às séries de chuva, aos dados do Rio Pomba e às simulações hidráulicas.



Desenvolver inicialmente a previsão meteorológica real, o painel de alertas e a central de notificações. Depois, implementar a correlação com os pontos críticos e os modelos hidráulicos.



Não usar dados fictícios em produção. Caso uma integração ainda não esteja configurada, exibir “Integração pendente” e disponibilizar uma área para configuração administrativa.



O resultado deverá ser um sistema de monitoramento preventivo que ajude a equipe técnica a identificar condições potencialmente perigosas, acompanhar a evolução da chuva e do rio e agir com antecedência, sem substituir os avisos oficiais, os protocolos de Defesa Civil ou a avaliação profissional.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f9669a7-7ed3-4250-be2b-00f4d895a5f1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
