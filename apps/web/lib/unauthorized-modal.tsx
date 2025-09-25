"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Button } from "@heroui/react";
import { ShieldAlert } from "lucide-react";

interface ModalAction {
  label: string;
  href?: string;
  onPress?: () => void;
}

interface UnauthorizedModalState {
  isOpen: boolean;
  title: string;
  description: string;
  primaryAction?: ModalAction;
  secondaryLabel?: string;
}

interface UnauthorizedModalContextValue {
  showUnauthorizedModal: (options?: Partial<Omit<UnauthorizedModalState, "isOpen">>) => void;
  hideUnauthorizedModal: () => void;
}

const UnauthorizedModalContext = createContext<UnauthorizedModalContextValue | undefined>(undefined);

const defaultState: UnauthorizedModalState = {
  isOpen: false,
  title: "Access restricted",
  description: "You don't have permission to perform this action. Please sign in or contact your administrator if you believe this is a mistake.",
  primaryAction: undefined,
  secondaryLabel: "Close"
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
              <div>
                <p className="text-sm uppercase tracking-wide text-white/70">Permission needed</p>
                <h3 className="text-xl font-semibold text-white">{state.title}</h3>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-white/70 leading-relaxed">
              {state.description}
            </p>
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center">
                  <span className="text-lg">🔒</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">Why am I seeing this?</p>
                  <p className="text-xs text-white/60">
                    This action is limited to users with elevated permissions. Sign in with an authorized account or reach out to your team lead for access.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/50">
                <div className="flex items-center gap-1">
                  <span className="text-sm">•</span>
                  <span>Authentication required for sensitive data</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm">•</span>
                  <span>Role-based access control enforced</span>
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
                {state.secondaryLabel ?? "Close"}
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
