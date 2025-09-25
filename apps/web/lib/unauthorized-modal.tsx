"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Button } from "@heroui/react";
import { ShieldAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const THAI_FONT_CLASS = "font-['IBM_Plex_Sans_Thai']";

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const THAI_FONT_CLASS = "font-['IBM_Plex_Sans_Thai']";

function cx(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function BilingualText({
  as: Component = "span",
  en,
  th,
  className,
  englishClassName,
  thaiClassName,
}: {
  as?: keyof JSX.IntrinsicElements;
  en: string;
  th: string;
  className?: string;
  englishClassName?: string;
  thaiClassName?: string;
}) {
  return (
    <Component className={className}>
      <span className={cx("block", englishClassName)}>{en}</span>
      <span className={cx("block", THAI_FONT_CLASS, thaiClassName)}>{th}</span>
    </Component>
  );
}

interface ModalAction {
  label: string;
  href?: string;
  onPress?: () => void;
}

interface UnauthorizedModalState {
  isOpen: boolean;
  title?: ReactNode;
  description?: ReactNode;
  primaryAction?: ModalAction;
  secondaryLabel?: ReactNode;
}

interface UnauthorizedModalContextValue {
  showUnauthorizedModal: (options?: Partial<Omit<UnauthorizedModalState, "isOpen">>) => void;
  hideUnauthorizedModal: () => void;
}

const UnauthorizedModalContext = createContext<UnauthorizedModalContextValue | undefined>(undefined);


const defaultState: UnauthorizedModalState = {
  isOpen: false,
  title: (
    <BilingualText
      as="span"
      en="Access restricted"
      th="จำกัดการเข้าถึง"
      className="flex flex-col leading-tight"
      englishClassName="text-white"
      thaiClassName="text-white/80 text-base font-normal"
    />
  ),
  description: (
    <BilingualText
      as="div"
      en="You don't have permission to perform this action. Please sign in or contact your administrator if you believe this is a mistake."
      th="คุณไม่มีสิทธิ์ในการดำเนินการนี้ หากคุณเชื่อว่าเป็นความผิดพลาด โปรดลงชื่อเข้าใช้หรือ ติดต่อผู้ดูแลระบบของคุณ"
      className="space-y-2 text-sm"
      englishClassName="text-white/70"
      thaiClassName="text-white/80"
    />
  ),
  primaryAction: undefined,
  secondaryLabel: "Close / ปิด"
};

export function UnauthorizedModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UnauthorizedModalState>({ isOpen: false });
  const t = useTranslations("unauthorizedModal");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isThai = useMemo(() => locale?.toLowerCase().startsWith("th") ?? false, [locale]);

  const showUnauthorizedModal = useCallback((options?: Partial<Omit<UnauthorizedModalState, "isOpen">>) => {
    setState({
      isOpen: true,
      ...options,
    });
  }, []);

  const hideUnauthorizedModal = useCallback(() => {
    setState({ isOpen: false });
  }, []);

  const value = useMemo(
    () => ({
      showUnauthorizedModal,
      hideUnauthorizedModal,
    }),
    [showUnauthorizedModal, hideUnauthorizedModal]
  );

  const handlePrimaryAction = useCallback(() => {
    const action = state.primaryAction;
    if (!action) {
      hideUnauthorizedModal();
      return;
    }

    if (action.onPress) {
      action.onPress();
    } else if (action.href) {
      window.location.href = action.href;
    }

    hideUnauthorizedModal();
  }, [state.primaryAction, hideUnauthorizedModal]);

  return (
    <UnauthorizedModalContext.Provider value={value}>
      {children}
      <Modal
        isOpen={state.isOpen}
        onOpenChange={(isOpen) => !isOpen && hideUnauthorizedModal()}
        classNames={{
          base: "bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 text-white",
          header: "pb-0",
          body: "pt-3",
        }}
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/80 via-orange-500/80 to-amber-400/80 text-white shadow-lg">
                <ShieldAlert size={24} />
              </div>
              <div className="space-y-1">
                <p
                  className={classNames(
                    "text-sm tracking-wide text-white/70",
                    !isThai && "uppercase",
                    isThai && THAI_FONT_CLASS,
                    isThai && "text-xs text-white/60"
                  )}
                >
                  {t("badge")}
                </p>
                <h3 className={classNames("text-xl font-semibold text-white", isThai && THAI_FONT_CLASS)}>
                  {state.title ?? t("title")}
                </h3>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className={classNames("text-sm text-white/70 leading-relaxed space-y-2", isThai && THAI_FONT_CLASS)}>
              {state.description ?? <p>{t("description")}</p>}
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center">
                  <span className="text-lg">🔒</span>
                </div>
                <div className="space-y-1">
                  <p
                    className={classNames(
                      "text-sm font-medium text-white/90",
                      isThai && THAI_FONT_CLASS,
                      isThai && "text-xs text-white/70"
                    )}
                  >
                    {t("whyTitle")}
                  </p>
                  <p
                    className={classNames(
                      "text-xs text-white/60",
                      isThai && THAI_FONT_CLASS,
                      isThai && "text-[11px] text-white/70"
                    )}
                  >
                    {t("whyDescription")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs text-white/50 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-start gap-1">
                  <span className="text-sm leading-none">•</span>
                  <span
                    className={classNames(
                      "leading-tight text-white/60",
                      isThai && THAI_FONT_CLASS,
                      isThai && "text-[11px]"
                    )}
                  >
                    {t("guidance.authentication")}
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="text-sm leading-none">•</span>
                  <span
                    className={classNames(
                      "leading-tight text-white/60",
                      isThai && THAI_FONT_CLASS,
                      isThai && "text-[11px]"
                    )}
                  >
                    {t("guidance.roleBasedAccess")}
                  </span>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
              <Button
                variant="light"
                className="text-white/70 hover:text-white"
                onPress={hideUnauthorizedModal}
                fullWidth
              >
                {state.secondaryLabel ?? tCommon("close")}
              </Button>
              {state.primaryAction && (
                <Button
                  color="primary"
                  className="bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 text-white font-semibold shadow-lg shadow-purple-500/40"
                  onPress={handlePrimaryAction}
                  fullWidth
                >
                  {state.primaryAction.label}
                </Button>
              )}
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </UnauthorizedModalContext.Provider>
  );
}

export function useUnauthorizedModal() {
  const context = useContext(UnauthorizedModalContext);
  if (!context) {
    throw new Error("useUnauthorizedModal must be used within an UnauthorizedModalProvider");
  }
  return context;
}
