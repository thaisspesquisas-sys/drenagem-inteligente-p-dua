# Roadmap — Drenagem Inteligente Pádua

- [x] Fase 1: autenticação, perfis (5), RLS, auditoria, dashboard real, cadastro de alagamentos e rede, calculadoras + testes, previsão Open-Meteo, central de dados, revisão, administração
- [x] Fase 2: importação GeoJSON/CSV na Central de Dados, busca e medição no mapa, fotografias (armazenamento privado no bucket `fotos`)
- [x] Fase 3: vistorias de campo (`/vistorias`), levantamentos topográficos e perfis longitudinais (`/topografia`), módulo de qualidade dos dados (`/qualidade`)
- [x] Fase 4: hidrologia com bacias/sub-bacias e Kirpich (`/bacias`), Manning com diagnósticos de Froude, velocidades críticas e perdas localizadas (`/calculos`)
- [x] Fase 5: preparação e registro de logs EPA SWMM / HEC-RAS, cenários de submersão e remanso do Rio Pomba (`/simulacoes`), comparador de alternativas (`/alternativas`)
- [x] Fase 6: relatórios técnicos para impressão/PDF (`/relatorios`), versionamento automático com invalidação de aprovação no banco (`version_reports`)
- [x] Módulo 25: motor de triagem de risco configurável (`alert_rules` / `alert_events`), correlação por ponto crítico e recomendações operacionais (`/previsao`)