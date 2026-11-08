# Análise Mobile - BFR Conecta v115

**Data**: 2026-11-08  
**Viewport**: 531x632 (mobile range ≤768px)  
**URL**: https://bfr-conecta.turmaroboticabfr.workers.dev/

## Estado da Sessão

- Token de teste encontrado no localStorage (conta secretary)
- Token **EXPIRADO** (expirou há ~67 minutos no momento do teste)
- Chave: `sb-yyzqoxlkcvqcpessypfjo-auth-token`
- UID: `f85b1894-4a23-4a94-8fa1-eca8ccaffc91`
- Email: `s19-secretary-429236@bfr-conecta.test`

## Achados da Tela de Login

### Elementos Visíveis
1. **Logo**: "BFR Conecta · Escola Benício Ferreira Reis" ✓
2. **Título H1**: "A escola mais próxima de cada família." ✓
3. **Subtítulo**: "Notas, frequência, agenda, comunicados e tudo o que importa para acompanhar a vida escolar." ✓
4. **Título H2**: "Bem-vindo de volta!" ✓
5. **Texto**: "Entre para gerenciar e fazer a diferença!" ✓
6. **Botão Google**: "Continuar com Google" ✓
7. **Botão Horários**: "Ver horários das aulas" ✓
8. **Texto**: "Seu acesso será direcionado automaticamente para o seu perfil." ✓
9. **Créditos**: "Criado por Raull Macedo" ✓
10. **Botão Privacidade**: "Privacidade / LGPD" ✓
11. **Botão Termos**: "Termos de uso" ✓
12. **Botão Contato**: "Contato" ✓
13. **Link Instagram**: "Instagram da escola ↗" ✓
14. **Link Calendário**: "Calendário letivo 2026 ↗" ✓
15. **Botão Instalar**: "Como instalar" ✓
16. **Texto Instalar**: "Abra o menu do navegador e escolha Instalar BFR Conecta ou Adicionar à tela inicial." ✓

### Comportamento dos Botões

**PROBLEMA CRÍTICO**: Nenhum dos botões da tela de login responde a cliques no viewport mobile.

#### Botões Testados
1. **"Continuar com Google"** (uid 1_8)
   - Clique: ✓ registrado
   - Resultado: ✗ nenhuma ação visível
   - Console: ✗ nenhum erro
   - Redirect: ✗ não ocorreu
   - Popup OAuth: ✗ não abriu

2. **"Ver horários das aulas"** (uid 1_9)
   - Clique: ✓ registrado
   - Resultado: ✗ nenhuma ação visível
   - Console: ✗ nenhum erro
   - Modal: ✗ não abriu
   - Redirect: ✗ não ocorreu

3. **"Privacidade / LGPD"** (uid 1_12)
   - Clique: ✓ registrado
   - Resultado: ✗ nenhuma ação visível
   - Console: ✗ nenhum erro
   - Modal: ✗ não abriu

### Análise Técnica

#### Estrutura dos Botões
```javascript
// Todos os botões não têm onclick inline
{
  className: "google-button",
  id: "googleLogin",
  onclick: "no onclick",  // ← problema
  text: "Continuar com Google"
}
```

#### Event Listeners
- Botões não possuem handlers `onclick` inline
- Event listeners provavelmente attachados via `addEventListener`
- No viewport mobile, os listeners parecem não estar funcionando
- Nenhum erro no console sugere que o JavaScript está carregando

#### Navegação Presente
A página contém **96 botões de navegação** para diferentes views:
- Platform views: Início, Aprender, Evoluir, Escola, Meu Espaço
- Professor views: Minhas turmas, Atividades, Avaliações, Frequência, etc.
- Secretaria views: Notas, Agenda, Central de Atividades, Horários, etc.
- Coordenação views: Coordenação escolar, Monitor escolar, Portaria QR, etc.
- Direção views: Direção escolar, Espaço de Apoio, AEE, etc.
- Mobile more options: Coordenação, Horários, Jogos educativos, etc.

**Todos ocultos na tela de login** (esperado), mas presentes no DOM.

## Erros no Console

1. **404**: `/cdn-cgi/rum` (Cloudflare analytics) - não crítico
2. **ERR_NAME_NOT_RESOLVED**: tentativa de refresh do token (esperado, falhou)

## Próximos Passos

### Opção A: Criar Nova Conta de Teste
- Requer service_role key do Supabase
- Gerar novo token via Auth Admin API
- Injetar sessão fresca no localStorage

### Opção B: Investigar Causa Raiz
- Inspecionar event listeners dos botões
- Verificar se há código condicional por viewport
- Analisar se o service worker está interferindo

### Opção C: Teste sem Autenticação
- Documentar todos os elementos visuais
- Medir layout e responsividade
- Verificar links externos (Instagram, Calendário)

## Recomendação

**Prioridade alta**: Os botões da tela de login não funcionam no mobile. Isso impede:
1. Login com Google (único método visível)
2. Acesso a horários públicos
3. Acesso a informações legais (Privacidade, Termos)
4. Instalação do PWA

**Impacto**: Usuários mobile não conseguem acessar o app.

**Ação necessária**: Investigar se é:
- Bug de código (event listeners não attachados no mobile)
- Problema de viewport (media queries bloqueando interações)
- Problema de service worker (cache antigo servindo versão quebrada)
