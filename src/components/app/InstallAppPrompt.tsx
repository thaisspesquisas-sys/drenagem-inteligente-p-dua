import { useEffect, useState } from "react";
import {
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  QrCode,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global singleton store so we never miss `beforeinstallprompt` if it fires early
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

export function registerPwaServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Service worker registration is progressive enhancement
    });
  });
}

type PlatformTab = "android" | "ios" | "desktop";

function detectDefaultPlatform(): PlatformTab {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const isStandaloneMedia =
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches);
  const isIosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );
  return isStandaloneMedia || isIosStandalone;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [platform, setPlatform] = useState<PlatformTab>("desktop");

  useEffect(() => {
    setIsInstalled(checkIsStandalone());
    setPlatform(detectDefaultPlatform());
    setDeferredPrompt(globalDeferredPrompt);

    const onUpdate = () => {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstalled(checkIsStandalone());
    };
    listeners.add(onUpdate);

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-mode: standalone)")
        : null;
    mediaQuery?.addEventListener?.("change", onUpdate);

    return () => {
      listeners.delete(onUpdate);
      mediaQuery?.removeEventListener?.("change", onUpdate);
    };
  }, []);

  const triggerNativeInstall = async (): Promise<boolean> => {
    if (!globalDeferredPrompt) return false;
    try {
      await globalDeferredPrompt.prompt();
      const choice = await globalDeferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        globalDeferredPrompt = null;
        notifyListeners();
        toast.success("Aplicativo Drenagem Inteligente Pádua instalado com sucesso!");
        return true;
      }
    } catch {
      // Fallback to manual instructions modal
    }
    return false;
  };

  return {
    canNativePrompt: Boolean(deferredPrompt),
    isInstalled,
    platform,
    triggerNativeInstall,
  };
}

export function InstallAppButton({
  variant = "header",
  className,
}: {
  variant?: "sidebar" | "header" | "auth" | "banner";
  className?: string;
}) {
  const { canNativePrompt, isInstalled, platform, triggerNativeInstall } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PlatformTab>(platform);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActiveTab(platform);
  }, [platform]);

  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "https://drenagem-padua.lovable.app";

  const handleClick = async () => {
    // Always open the modal so the user can choose between 1-click PC install or QR code / Mobile instructions
    setOpen(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      toast.success("Link do aplicativo copiado!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Drenagem Inteligente — Santo Antônio de Pádua",
          text: "Acesse e instale o aplicativo oficial de Drenagem Inteligente e Previsão INMET de Santo Antônio de Pádua:",
          url: appUrl,
        });
        return;
      } catch {
        // User cancelled share
      }
    }
    await handleCopyLink();
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&color=0f2744&bgcolor=ffffff&data=${encodeURIComponent(
    appUrl
  )}`;

  return (
    <>
      {variant === "sidebar" && (
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-water/40 bg-water/15 px-3 py-2 text-left text-xs font-semibold text-sidebar-foreground transition-all hover:bg-water/25",
            className
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Download className="h-4 w-4 shrink-0 text-sky-400" />
            <span className="truncate">
              {isInstalled ? "App Instalado · Abrir Guia" : "Baixar App (Celular / PC)"}
            </span>
          </span>
          <span className="shrink-0 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-300">
            {canNativePrompt ? "1-Click" : "PWA"}
          </span>
        </button>
      )}

      {variant === "header" && (
        <button
          type="button"
          onClick={handleClick}
          title="Baixar aplicativo no Celular (Android / iPhone) ou Computador (Windows / Mac)"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-500/20 dark:text-sky-300",
            className
          )}
        >
          <Download className="h-3.5 w-3.5" />
          <span>{isInstalled ? "App Instalado" : "Baixar App"}</span>
          <span className="hidden sm:inline text-[10px] opacity-75">(Celular / PC)</span>
        </button>
      )}

      {variant === "auth" && (
        <div
          className={cn(
            "rounded-xl border border-border bg-card/80 p-3.5 shadow-xs",
            className
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground">
                  Disponível para Celular e Computador
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Android, iPhone (iOS), Windows e Mac
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleClick}
              className="shrink-0 gap-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar App
            </Button>
          </div>
        </div>
      )}

      {variant === "banner" && !isInstalled && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-950/90 via-slate-900/90 to-sky-900/90 px-4 py-3 text-white shadow-md",
            className
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 ring-1 ring-sky-400/40">
              <Download className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>Instale o Aplicativo no Celular e no Computador</span>
                <span className="rounded-full bg-sky-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-200">
                  Android · iOS · Windows · Mac
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Acesse vistorias de campo, mapa de alagamentos e alertas oficiais do INMET direto da sua Tela Inicial ou Área de Trabalho.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canNativePrompt && (
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const ok = await triggerNativeInstall();
                  if (!ok) setOpen(true);
                }}
                className="bg-sky-500 font-semibold text-white hover:bg-sky-400"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Instalar Agora
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleClick}
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              <Smartphone className="mr-1.5 h-3.5 w-3.5" />
              Celular / PC
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-primary" />
              Baixar Drenagem Inteligente Pádua (Celular e Computador)
            </DialogTitle>
            <DialogDescription>
              Instale o aplicativo oficial no seu celular (Android ou iPhone) ou no computador (Windows, Mac ou Linux) sem ocupar memória e com atualização automática em tempo real.
            </DialogDescription>
          </DialogHeader>

          {/* 1-Click Native Install Callout when supported */}
          {canNativePrompt && (
            <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="h-4 w-4" />
                    Instalação Direta em 1 Clique Disponível neste Dispositivo!
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Seu navegador suporta instalação direta. Clique no botão ao lado para instalar o aplicativo agora mesmo.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={async () => {
                    const installed = await triggerNativeInstall();
                    if (installed) setOpen(false);
                  }}
                  className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Instalar Agora neste Aparelho
                </Button>
              </div>
            </div>
          )}

          {isInstalled && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Você já está executando o aplicativo instalado neste dispositivo! Veja abaixo como instalar também no seu celular ou em outro computador.
            </div>
          )}

          {/* Platform selector tabs */}
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setActiveTab("android")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all",
                activeTab === "android"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Celular Android
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ios")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all",
                activeTab === "ios"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              iPhone / iPad (iOS)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("desktop")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all",
                activeTab === "desktop"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
              Computador (PC / Mac)
            </button>
          </div>

          {/* Platform instructions */}
          {activeTab === "android" && (
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">Como instalar no Celular Android (Chrome / Samsung)</h4>
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Cria ícone na Tela Inicial
                </span>
              </div>
              <ol className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    1
                  </span>
                  <span>
                    Abra o sistema no navegador <strong>Google Chrome</strong> do seu celular Android (você pode ler o <strong>QR Code abaixo</strong> com a câmera do celular).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    2
                  </span>
                  <span>
                    Toque no botão <strong>&ldquo;Instalar Agora&rdquo;</strong> que aparece no topo ou toque no menu de <strong>3 pontinhos (⋮)</strong> no canto superior direito do Chrome.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    3
                  </span>
                  <span>
                    Selecione <strong>&ldquo;Instalar aplicativo&rdquo;</strong> (ou <em>&ldquo;Adicionar à tela inicial&rdquo;</em>) e confirme em <strong>Instalar</strong>. O ícone <strong>Drenagem Pádua</strong> ficará junto aos seus aplicativos!
                  </span>
                </li>
              </ol>
            </div>
          )}

          {activeTab === "ios" && (
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">Como instalar no iPhone ou iPad (Safari iOS)</h4>
                <span className="rounded bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                  Tela cheia nativa iOS
                </span>
              </div>
              <ol className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    1
                  </span>
                  <span>
                    Abra este endereço no navegador <strong>Safari</strong> do seu iPhone ou iPad (aponte a câmera do iPhone para o <strong>QR Code abaixo</strong>).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    2
                  </span>
                  <span>
                    Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com uma seta para cima <strong>⬆️</strong> na barra inferior do Safari).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    3
                  </span>
                  <span>
                    Role a lista para baixo, toque em <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong> e depois toque em <strong>&ldquo;Adicionar&rdquo;</strong> no canto superior direito.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {activeTab === "desktop" && (
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">Como instalar no Computador (Windows, Mac ou Linux)</h4>
                <span className="rounded bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  Atalho na Área de Trabalho e Menu Iniciar
                </span>
              </div>
              <ol className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    1
                  </span>
                  <span>
                    No <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>, se o botão verde <strong>&ldquo;Instalar Agora neste Aparelho&rdquo;</strong> aparecer acima, basta clicar nele.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    2
                  </span>
                  <span>
                    Ou clique no <strong>ícone de instalação</strong> (um pequeno computador com uma seta para baixo) localizado no <strong>canto direito da barra de endereços</strong> do navegador.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    3
                  </span>
                  <span>
                    Confirme em <strong>&ldquo;Instalar&rdquo;</strong>. O sistema abrirá como um programa independente no Windows/Mac e criará atalho na sua <strong>Área de Trabalho</strong> e <strong>Barra de Tarefas</strong>.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {/* QR Code + Share Link to easily open on phone */}
          <div className="grid gap-4 rounded-xl border bg-muted/40 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="mx-auto flex flex-col items-center rounded-lg border bg-white p-2 shadow-xs">
              <img
                src={qrCodeUrl}
                alt="QR Code para abrir no celular"
                width={132}
                height={132}
                className="h-[132px] w-[132px] rounded"
                loading="lazy"
              />
              <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-700">
                <QrCode className="h-3 w-3" /> Aponte a câmera do celular
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-bold text-foreground">
                Enviar para o seu Celular ou Equipe Técnica
              </div>
              <p className="text-xs text-muted-foreground">
                Escaneie o QR Code ao lado com a câmera do seu celular ou copie o link abaixo para enviar por WhatsApp / E-mail e instalar nos aparelhos de campo:
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  className="h-8 flex-1 rounded-md border bg-background px-2.5 font-mono text-xs text-foreground"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleCopyLink}>
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
                    </>
                  )}
                </Button>
                <Button type="button" size="sm" onClick={handleShare}>
                  <Share2 className="mr-1 h-3.5 w-3.5" /> Compartilhar
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Funciona em Tela Cheia
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> GPS p/ Vistorias de Campo
                </span>
                <a
                  href="/manifest.webmanifest"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Manifesto PWA Ativo
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

