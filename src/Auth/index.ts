import { Magic, MagicUserMetadata } from 'magic-sdk';
import axios from 'axios';
import { EventEmitter } from 'events';

import {
  crypto,
  querystring,
} from 'mainProcess/electron';
import {
  openLink,
  isDev,
  changeUserInMain,
  refreshAuthInOtherWindows,
} from 'mainProcess';
import { timeout } from 'utils';

export enum AuthError {
  // The error when the user sign out failed.
  // User is signed in and metadata may be present.
  FailedSigningOutUser = 'Failed signing out user',

  // The error when the user sign in failed.
  // User is not signed in and no metadata are present.
  FailedLoadingUser = 'Failed loading user',

  // The rror when the fetching of user's metadata failed after the user was successfuly signed in.
  // User was explicitly signed out and no metadata are present.
  FailedLoadingUserMetadata = 'Failed loading user metadata',
}

export enum AuthState {
  // The state when the app finds no signed in user during the initial check and the state when the sign in fails.
  // User is not signed in and no metadata are present. The error field may be populated by the AuthError.
  NoUser,

  // LOADING STATE
  // The initial state when the app starts and the state after user start the sign-in flow.
  // User is not signed in and no metadata are present.
  LoadingUser,

  // LOADING STATE
  // The state when the sign out was requested but was not completed yet.
  // User may be signed in and metadata may be present
  SigningOutUser,

  // LOADING STATE
  // The state when the user is signed in, but the app is still fetching user metadata.
  // User is signed in, but metadata are not fetched yet. 
  LoadingUserMetadata,

  // The state when the user is signed in and the metadata were successfuly fetched.
  // User is signed in and metadata are present.
  UserAndMetadataLoaded,
}

type FailedSignOutAuthInfo = { state: AuthState.NoUser, error: AuthError.FailedSigningOutUser, metadata?: MagicUserMetadata };
type FailedLoadingAuthInfo = { state: AuthState.NoUser, error: AuthError };
type InitialAuthInfo = { state: AuthState.NoUser };
type SuccessfulAuthInfo = { state: AuthState.UserAndMetadataLoaded, metadata: MagicUserMetadata };
type LoadingUserAuthInfo = { state: AuthState.LoadingUser }
type LoadingUserMetadataAuthInfo = { state: AuthState.LoadingUserMetadata }
type SigningOutUserAuthInfo = { state: AuthState.SigningOutUser }

export type AuthInfo = FailedSignOutAuthInfo
  | FailedLoadingAuthInfo
  | InitialAuthInfo
  | SuccessfulAuthInfo
  | LoadingUserAuthInfo
  | LoadingUserMetadataAuthInfo
  | SigningOutUserAuthInfo;

export type { MagicUserMetadata };

export const authEmitter = new EventEmitter();
export let authInfo: AuthInfo = { state: AuthState.LoadingUser };

const url = isDev ? 'https://dev.usedevbook.com/auth' : 'https://api.usedevbook.com/auth';
// const url = 'http://localhost:3002/auth';
const magicAPIKey = isDev ? 'pk_test_2AE829E9A03C1FA0' : 'pk_live_C99F68FD8F927F2E';
const magic = new Magic(magicAPIKey);

let signInCancelHandle: (() => void) | undefined = undefined;

refreshAuthInfo();

function changeAnalyticsUserAndSaveEmail(auth: AuthInfo) {
  if (auth.state === AuthState.UserAndMetadataLoaded) {
    const email = auth?.metadata?.email || undefined;
    const userID = auth?.metadata?.publicAddress || undefined;
    changeUserInMain(userID && email ? { userID, email } : undefined);
  } if (auth.state === AuthState.NoUser) {
    changeUserInMain();
  }
}

function generateSessionID() {
  return encodeURIComponent(crypto.randomBytes(64).toString('base64'));
};

function updateAuthInfo(newAuthInfo: AuthInfo) {
  authInfo = newAuthInfo;
  authEmitter.emit('changed', authInfo);
  changeAnalyticsUserAndSaveEmail(authInfo);
}

export async function signOut() {
  const oldAuthInfo = authInfo;
  updateAuthInfo({ state: AuthState.SigningOutUser });
  try {
    await magic.user.logout();
    updateAuthInfo({ state: AuthState.NoUser });
    refreshAuthInOtherWindows();
  } catch (error) {
    updateAuthInfo(oldAuthInfo);
    refreshAuthInOtherWindows();

    console.error(error.message);
  }
}

export function cancelSignIn() {
  signInCancelHandle?.();
}

async function syncUserMetadata(didToken: string) {
  updateAuthInfo({ state: AuthState.LoadingUserMetadata });

  try {
    const metadata = await magic.user.getMetadata()

    updateAuthInfo({ state: AuthState.UserAndMetadataLoaded, metadata });
    refreshAuthInOtherWindows();

    try {
      await axios.post(`${url}/signin`, {
        didToken,
      });
    } catch (error) {
      console.error('Failed sending user metadata to the server', error.message);
    }

  } catch (error) {
    updateAuthInfo({ state: AuthState.NoUser, error: AuthError.FailedLoadingUserMetadata });
    refreshAuthInOtherWindows();

    console.error(error.message);

    signOut();
  }
}

export async function signIn(email: string) {
  cancelSignIn();

  let rejectHandle: (reason?: any) => void;
  let isCancelled = false;

  const cancelableSignIn = new Promise<void>(async (resolve, reject) => {
    rejectHandle = reject;

    const sessionID = generateSessionID();

    const params = querystring.encode({
      email,
      ...isDev && { test: 'true' },
    });

    await openLink(`${url}/signin/${sessionID}?${params}`);

    let credential: string | undefined = undefined;

    const requestLimit = 15 * 60;

    for (let i = 0; i < requestLimit; i++) {
      if (isCancelled) {
        break;
      }

      if (credential) {
        break;
      }

      try {
        const result = await axios.get(`${url}/credential/${sessionID}`, {
          params: {
            email,
          },
        });

        credential = result.data.credential;
        break;

      } catch (error) {
        if (error.response?.status !== 404) {
          break;
        }
      }
      await timeout(1000);
    }

    if (isCancelled) {
      try {
        await axios.delete(`${url}/credential/${sessionID}`);
        return reject({ message: 'Sign in was cancelled' });
      } catch (error) {
        console.error(error.message);
        return reject({ message: 'Sign in could not be cancelled' });
      }
    }

    if (!credential && !isCancelled) {
      return reject({ message: 'Getting credential for sign in timed out' });
    }

    try {
      const didToken = await magic.auth.loginWithCredential(credential);

      if (didToken) {
        updateAuthInfo({ state: AuthState.LoadingUserMetadata });
        syncUserMetadata(didToken);
        return resolve();
      } else {
        updateAuthInfo({ state: AuthState.NoUser, error: AuthError.FailedLoadingUser });
      }

      return reject({ message: 'Could not complete the sign in' });
    } catch (error) {
      console.error(error);
      return reject({ message: error.message });
    }
  });

  signInCancelHandle = () => {
    rejectHandle({ message: 'Sign in was cancelled' });
    isCancelled = true;
  };

  return cancelableSignIn;
}

export async function refreshAuthInfo() {
  updateAuthInfo({ state: AuthState.LoadingUser });

  try {
    const isUserSignedIn = await magic.user.isLoggedIn();

    if (!isUserSignedIn) {
      updateAuthInfo({ state: AuthState.NoUser });
      return;
    }

    updateAuthInfo({ state: AuthState.LoadingUserMetadata });

    try {
      const metadata = await magic.user.getMetadata();
      updateAuthInfo({ state: AuthState.UserAndMetadataLoaded, metadata });

    } catch (error) {
      updateAuthInfo({ state: AuthState.NoUser, error: AuthError.FailedLoadingUserMetadata });
      refreshAuthInOtherWindows();

      console.error(error.message);

      signOut();
    }

  } catch (error) {
    updateAuthInfo({ state: AuthState.NoUser, error: AuthError.FailedLoadingUser });

    console.error(error.message);
  }
}
