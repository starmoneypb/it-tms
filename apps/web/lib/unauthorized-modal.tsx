"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Button } from "@heroui/react";
import { ShieldAlert } from "lucide-react";

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
  title: ReactNode;
  description: ReactNode;
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
  const [state, setState] = useState<UnauthorizedModalState>(defaultState);

  const showUnauthorizedModal = useCallback((options?: Partial<Omit<UnauthorizedModalState, "isOpen">>) => {
    setState({
      ...defaultState,
      ...options,
      isOpen: true,
      title: options?.title ?? defaultState.title,
      description: options?.description ?? defaultState.description,
      secondaryLabel: options?.secondaryLabel ?? defaultState.secondaryLabel,
      primaryAction: options?.primaryAction,
    });
  }, []);

  const hideUnauthorizedModal = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
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
          base: "bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 text-white", // slate-900
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
                <BilingualText
                  as="p"
                  className="text-sm tracking-wide text-white/70"
                  en="Permission needed"
                  th="จำเป็นต้องได้รับสิทธิ์"
                  englishClassName="uppercase"
                  thaiClassName="text-xs normal-case text-white/60"
                />
                <h3 className="text-xl font-semibold text-white">{state.title}</h3>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="text-sm text-white/70 leading-relaxed space-y-2">
              {state.description}
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center">
                  <span className="text-lg">🔒</span>
                </div>
                <div className="space-y-1">
                  <BilingualText
                    as="p"
                    className="text-sm font-medium text-white/90"
                    en="Why am I seeing this?"
                    th="ทำไมฉันจึงเห็นข้อความนี้?"
                    thaiClassName="text-xs font-normal text-white/70"
                  />
                  <BilingualText
                    as="p"
                    className="text-xs text-white/60"
                    en="This action is limited to users with elevated permissions. Sign in with an authorized account or reach out to your team lead for access."
                    th="การดำเนินการนี้จำกัดเฉพาะผู้ใช้ที่มีสิทธิ์ระดับสูง โปรดลงชื่อเข้าใช้ด้วยบัญชีที่ได้รับอนุญาตหรือ ติดต่อหัวหน้าทีมของคุณเพื่อขอสิทธิ์เข้าถึง"
                    thaiClassName="text-[11px] text-white/70"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs text-white/50 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-start gap-1">
                  <span className="text-sm leading-none">•</span>
                  <BilingualText
                    as="span"
                    en="Authentication required for sensitive data"
                    th="ต้องยืนยันตัวตนเพื่อเข้าถึงข้อมูลสำคัญ"
                    englishClassName="leading-tight"
                    thaiClassName="text-[11px] text-white/60"
                  />
                </div>
                <div className="flex items-start gap-1">
                  <span className="text-sm leading-none">•</span>
                  <BilingualText
                    as="span"
                    en="Role-based access control enforced"
                    th="ระบบควบคุมการเข้าถึงตามบทบาทกำลังทำงาน"
                    englishClassName="leading-tight"
                    thaiClassName="text-[11px] text-white/60"
                  />
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
                {state.secondaryLabel ?? "Close / ปิด"}
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
