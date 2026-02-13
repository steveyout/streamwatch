import { useCallback } from "react";

import { SessionResponse } from "@/backend/accounts/auth";
import { bookmarkMediaToInput } from "@/backend/accounts/bookmarks";
import {
  bytesToBase64,
  bytesToBase64Url,
  encryptData,
  getCredentialId,
  keysFromCredentialId,
  keysFromMnemonic,
  signChallenge,
  storeCredentialMapping,
} from "@/backend/accounts/crypto";
import { getGroupOrder } from "@/backend/accounts/groupOrder";
import { importBookmarks, importProgress } from "@/backend/accounts/import";
import { getLoginChallengeToken, loginAccount } from "@/backend/accounts/login";
import { progressMediaItemToInputs } from "@/backend/accounts/progress";
import {
  getRegisterChallengeToken,
  registerAccount,
} from "@/backend/accounts/register";
import { removeSession } from "@/backend/accounts/sessions";
import { getSettings } from "@/backend/accounts/settings";
import {
  UserResponse,
  getBookmarks,
  getProgress,
  getUser,
  getWatchHistory,
} from "@/backend/accounts/user";
import { useAuthData } from "@/hooks/auth/useAuthData";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { AccountWithToken, useAuthStore } from "@/stores/auth";
import { BookmarkMediaItem } from "@/stores/bookmarks";
import { ProgressMediaItem } from "@/stores/progress";

export interface RegistrationData {
  recaptchaToken?: string;
  mnemonic?: string;
  credentialId?: string;
  userData: {
    device: string;
    profile: {
      colorA: string;
      colorB: string;
      icon: string;
    };
  };
}

export interface LoginData {
  mnemonic?: string;
  credentialId?: string;
  userData: {
    device: string;
  };
}

export function useAuth() {
  const currentAccount = useAuthStore((s) => s.account);
  const profile = useAuthStore((s) => s.account?.profile);
  const loggedIn = !!useAuthStore((s) => s.account);
  const backendUrl = useBackendUrl();
  const {
    logout: userDataLogout,
    login: userDataLogin,
    syncData,
  } = useAuthData();

  const login = useCallback(
    async (loginData: LoginData) => {
      if (!backendUrl) return;
      if (!loginData.mnemonic && !loginData.credentialId) {
        throw new Error("Either mnemonic or credentialId must be provided");
      }

      const keys = loginData.credentialId
        ? await keysFromCredentialId(loginData.credentialId)
        : await keysFromMnemonic(loginData.mnemonic!);
      const publicKeyBase64Url = bytesToBase64Url(keys.publicKey);

      // Try to get credential ID from storage if using mnemonic
      let credentialId: string | null = null;
      if (loginData.mnemonic) {
        credentialId = getCredentialId(backendUrl, publicKeyBase64Url);
      } else {
        credentialId = loginData.credentialId || null;
      }

      const { challenge } = await getLoginChallengeToken(
        backendUrl,
        publicKeyBase64Url,
      );
      const signature = await signChallenge(keys, challenge);
      const loginResult = await loginAccount(backendUrl, {
        challenge: {
          code: challenge,
          signature,
        },
        publicKey: publicKeyBase64Url,
        device: await encryptData(loginData.userData.device, keys.seed),
      });

      const user = await getUser(backendUrl, loginResult.token);
      const seedBase64 = bytesToBase64(keys.seed);

      // Store credential mapping if we have a credential ID
      if (credentialId) {
        storeCredentialMapping(backendUrl, publicKeyBase64Url, credentialId);
      }

      return userDataLogin(loginResult, user.user, user.session, seedBase64);
    },
    [userDataLogin, backendUrl],
  );

  const logout = useCallback(async () => {
    if (!currentAccount || !backendUrl) return;
    try {
      await removeSession(
        backendUrl,
        currentAccount.token,
        currentAccount.sessionId,
      );
    } catch {
      // we dont care about failing to delete session
    }
    await userDataLogout();
  }, [userDataLogout, backendUrl, currentAccount]);

  const disconnectFromBackend = useCallback(async () => {
    if (!currentAccount || !backendUrl) return;
    try {
      await removeSession(
        backendUrl,
        currentAccount.token,
        currentAccount.sessionId,
      );
    } catch {
      // we dont care about failing to delete session
    }
    // Only remove the account, keep all local data
    useAuthStore.getState().removeAccount();
  }, [backendUrl, currentAccount]);

  const register = useCallback(
    async (registerData: RegistrationData) => {
      if (!backendUrl) return;
      if (!registerData.mnemonic && !registerData.credentialId) {
        throw new Error("Either mnemonic or credentialId must be provided");
      }

      const { challenge } = await getRegisterChallengeToken(
        backendUrl,
        registerData.recaptchaToken,
      );
      const keys = registerData.credentialId
        ? await keysFromCredentialId(registerData.credentialId)
        : await keysFromMnemonic(registerData.mnemonic!);
      const signature = await signChallenge(keys, challenge);
      const publicKeyBase64Url = bytesToBase64Url(keys.publicKey);
      const registerResult = await registerAccount(backendUrl, {
        challenge: {
          code: challenge,
          signature,
        },
        publicKey: publicKeyBase64Url,
        device: await encryptData(registerData.userData.device, keys.seed),
        profile: registerData.userData.profile,
      });

      // Store credential mapping if we have a credential ID
      if (registerData.credentialId) {
        storeCredentialMapping(
          backendUrl,
          publicKeyBase64Url,
          registerData.credentialId,
        );
      }

      return userDataLogin(
        registerResult,
        registerResult.user,
        registerResult.session,
        bytesToBase64(keys.seed),
      );
    },
    [backendUrl, userDataLogin],
  );

  const importData = useCallback(
    async (
      account: AccountWithToken,
      progressItems: Record<string, ProgressMediaItem>,
      bookmarks: Record<string, BookmarkMediaItem>,
    ) => {
      if (!backendUrl) return;
      if (
        Object.keys(progressItems).length === 0 &&
        Object.keys(bookmarks).length === 0
      ) {
        return;
      }

      const progressInputs = Object.entries(progressItems).flatMap(
        ([tmdbId, item]) => progressMediaItemToInputs(tmdbId, item),
      );

      const bookmarkInputs = Object.entries(bookmarks).map(([tmdbId, item]) =>
        bookmarkMediaToInput(tmdbId, item),
      );

      await Promise.all([
        importProgress(backendUrl, account, progressInputs),
        importBookmarks(backendUrl, account, bookmarkInputs),
      ]);
    },
    [backendUrl],
  );

  const restore = useCallback(
    async (account: AccountWithToken) => {
      if (!backendUrl) return;
      let user: { user: UserResponse; session: SessionResponse };
      try {
        user = await getUser(backendUrl, account.token);
      } catch (err) {
        const anyError: any = err;
        if (
          anyError?.response?.status === 401 ||
          anyError?.response?.status === 403 ||
          anyError?.response?.status === 400
        ) {
          await logout();
          return;
        }
        console.error(err);
        throw err;
      }

      const [bookmarks, progress, watchHistory, settings, groupOrder] =
        await Promise.all([
          getBookmarks(backendUrl, account),
          getProgress(backendUrl, account),
          getWatchHistory(backendUrl, account),
          getSettings(backendUrl, account),
          getGroupOrder(backendUrl, account),
        ]);

      // Update account store with fresh user data (including nickname)
      const { setAccount } = useAuthStore.getState();
      if (account) {
        setAccount({
          ...account,
          nickname: user.user.nickname,
          profile: user.user.profile,
        });
      }

      syncData(
        user.user,
        user.session,
        progress,
        bookmarks,
        watchHistory,
        settings,
        groupOrder,
      );
    },
    [backendUrl, syncData, logout],
  );

  return {
    loggedIn,
    profile,
    login,
    logout,
    disconnectFromBackend,
    register,
    restore,
    importData,
  };
}
