# Kubstorm Desktop (Electron)

Kubstorm agora pode ser usado como uma aplicação desktop multiplataforma usando Electron.

## Desenvolvimento

Para desenvolver e testar o Electron:

```bash
npm run electron-dev
```

Isso vai:
1. Iniciar o servidor Next.js em http://localhost:3000
2. Abrir a janela do Electron com a aplicação
3. Ativar DevTools para debug

## Produção - Gerar Instaladores

### Build e criar instaladores para todas as plataformas:

```bash
npm run electron-build
```

Isso vai:
1. Fazer build do Next.js (standalone mode)
2. Criar instaladores para Windows, macOS e Linux
3. Salvar em `/dist/` com os seguintes arquivos:

#### Windows
- `Kubstorm-x.x.x.exe` — Instalador NSIS (com wizard)
- `Kubstorm-x.x.x-portable.exe` — Executável portável (sem instalação)

#### macOS
- `Kubstorm-x.x.x.dmg` — Instalador DMG
- `Kubstorm-x.x.x.zip` — Arquivo ZIP

#### Linux
- `kubstorm-x.x.x.AppImage` — AppImage executável
- `kubstorm-x.x.x.deb` — Pacote Debian

## Estrutura

```
electron/
├── main.js       — Arquivo principal do Electron
└── preload.js    — Segurança (context isolation)

package.json     — Configuração do electron-builder
next.config.ts   — Configurado para output standalone
```

## Recursos

✅ Multiplataforma (Windows, macOS, Linux)
✅ Instaladores automáticos
✅ Menu nativo (File, Edit, View)
✅ DevTools em desenvolvimento
✅ Context isolation (segurança)
✅ Chromium embutido (não precisa do navegador)

## Tamanho

Cada instalador tem aproximadamente:
- **Windows**: ~200-250MB
- **macOS**: ~250-300MB  
- **Linux**: ~180-220MB

(O tamanho inclui Chromium e Node.js)

## Dicas

1. **Atualizar versão**: Editar `"version"` no `package.json`
2. **Ícone customizado**: Substituir `public/favicon.ico`
3. **Nome app**: Editar `"productName"` no `package.json`
4. **Certificados**: Para macOS/Windows, assinar com certificados

## Problema de Permissões (macOS)

Se receber erro de "not signed", na primeira execução:

```bash
sudo xattr -rd com.apple.quarantine /Applications/Kubstorm.app
```

## Próximas Melhorias

- [ ] Auto-update via electron-updater
- [ ] Sistema de notificações nativas
- [ ] Tray icon (rodar em background)
- [ ] Sincronização de dados com a nuvem
