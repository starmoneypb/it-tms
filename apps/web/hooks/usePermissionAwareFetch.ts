"use client";

import { useCallback } from "react";
import { useUnauthorizedModal } from "@/lib/unauthorized-modal";

interface PermissionAwareOptions {
  feature?: string;
  message?: string;
  signInPath?: string;
  hideSignInCta?: boolean;
  primaryActionLabel?: string;
}

export function usePermissionAwareFetch() {
  const { showUnauthorizedModal } = useUnauthorizedModal();

  return useCallback(
    async (
      input: RequestInfo | URL,
      init?: RequestInit,
      options?: PermissionAwareOptions
    ) => {
      const response = await fetch(input, init);

      if (response.status === 401 || response.status === 403) {
        const feature = options?.feature;
        const defaultMessage = feature
          ? `You don't have permission to ${feature}.`
          : "You don't have permission to perform this action.";

        let signInPath = options?.signInPath;
        if (!options?.hideSignInCta && !signInPath && typeof window !== "undefined") {
          const [maybeLocale] = window.location.pathname.split("/").filter(Boolean);
          const locale = maybeLocale || "en";
          const redirectTarget = `${window.location.pathname}${window.location.search}`;
          signInPath = `/${locale}/sign-in?redirect=${encodeURIComponent(redirectTarget || "/dashboard")}`;
        }

        showUnauthorizedModal({
          description: options?.message ?? `${defaultMessage} Please sign in with an account that has the appropriate permissions or reach out to your administrator for access.`,
          primaryAction: options?.hideSignInCta
            ? undefined
            : signInPath
              ? {
                  label: options?.primaryActionLabel ?? "Go to sign-in",
                  href: signInPath,
                }
              : undefined,
        });

        return null;
      }

      return response;
    },
    [showUnauthorizedModal]
  );
}
