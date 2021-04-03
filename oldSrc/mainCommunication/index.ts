import { IPCMessage } from './ipc';
import electron, { isDev } from './electron';
import { ResultsFilter } from 'Home/SearchHeaderPanel';
import { DocSource } from 'Search/docs';
import {
  AuthInfo,
  updateAuth,
  signOut,
  auth,
} from 'Auth';
import { PreferencesPage } from 'Preferences';
import { SearchMode } from 'Preferences/Pages/searchMode';

// So we see logs from the main process in the Chrome debug tools.
electron.ipcRenderer.on('console', (_, args) => {
  const [type, ...consoleArgs] = args;
  console[type as 'log' | 'error']?.('[main]:', ...consoleArgs);
});

// This event can be only send TO mainWindow
electron.ipcRenderer.on(IPCMessage.GetAuthFromMainWindow, () => {
  setAuthInOtherWindows(auth);
});

electron.ipcRenderer.on(IPCMessage.SetAuthInOtherWindows, (_, auth: AuthInfo) => {
  updateAuth(auth);
});

electron.ipcRenderer.on(IPCMessage.SignOut, () => {
  signOut();
});

export function setAuthInOtherWindows(auth: AuthInfo) {
  electron.ipcRenderer.send(IPCMessage.SetAuthInOtherWindows, auth);
}

export function signOutUser() {
  return electron.ipcRenderer.send(IPCMessage.SignOut);
}

export function getGlobalShortcut() {
  return electron.ipcRenderer.invoke('get-global-shortcut') as Promise<string>;
}

export function getSearchMode() {
  return electron.ipcRenderer.invoke(IPCMessage.GetSearchMode) as Promise<SearchMode>;
}

export function openLink(url: string) {
  return electron.shell.openExternal(url);
}

export function changeUserInMain(user?: { userID: string, email: string }) {
  electron.ipcRenderer.send(IPCMessage.ChangeUserInMain, user);
}

export function getSavedSearchQuery(): Promise<string> {
  return electron.ipcRenderer.invoke('get-saved-search-query');
}

export async function getSavedSearchFilter(): Promise<ResultsFilter> {
  const filter = await (electron.ipcRenderer.invoke('get-saved-search-filter') as Promise<string>);
  return ResultsFilter[filter as ResultsFilter] || ResultsFilter.StackOverflow;
}

export function trackShortcut(shortcutInfo: { action: string }) {
  electron.ipcRenderer.send('track-shortcut', { shortcutInfo });
}

export function hideMainWindow() {
  electron.ipcRenderer.send('hide-window');
}

export function saveSearchQuery(query: string) {
  electron.ipcRenderer.send('save-search-query', { query });
}

export function saveSearchFilter(filter: ResultsFilter) {
  electron.ipcRenderer.send('save-search-filter', { filter: filter.toString() });
}

export function trackSearch(searchInfo: {
  activeFilter: string,
  query: string,
  searchMode: SearchMode | undefined,
  activeDocSource?: DocSource,
}) {
  electron.ipcRenderer.send('track-search', searchInfo);
}

export function trackModalOpened(modalInfo: {
  activeFilter: string,
  url: string;
}) {
  electron.ipcRenderer.send('track-modal-opened', modalInfo);
}

export function userDidChangeShortcut(shortcut: string) {
  electron.ipcRenderer.send('user-did-change-shortcut', { shortcut });
}

export function userDidChangeSearchMode(mode: SearchMode) {
  electron.ipcRenderer.send(IPCMessage.UserDidChangeSearchMode, { mode });
}

export function getAuthFromMainWindow() {
  electron.ipcRenderer.send(IPCMessage.GetAuthFromMainWindow);
}

export function openPreferences(page?: PreferencesPage) {
  electron.ipcRenderer.send('open-preferences', { page });
}

export function openSignInModal() {
  electron.ipcRenderer.send(IPCMessage.OpenSignInModal);
}

export function postponeUpdate() {
  electron.ipcRenderer.send('postpone-update');
}

export function finishOnboarding() {
  electron.ipcRenderer.send('finish-onboarding');
}

export function restartAndUpdate(location: 'banner' | 'preferences') {
  electron.ipcRenderer.send('restart-and-update', location);
}

export function getUpdateStatus(): Promise<boolean> {
  return electron.ipcRenderer.invoke('update-status');
}

export function saveDocSearchResultsDefaultWidth(width: number) {
  electron.ipcRenderer.send('save-doc-search-results-default-width', { width });
}

export function getDocSearchResultsDefaultWidth(): Promise<number> {
  return electron.ipcRenderer.invoke('get-doc-search-results-default-width');
}

export function getActiveDocSource(): Promise<DocSource | undefined> {
  return electron.ipcRenderer.invoke(IPCMessage.GetActiveDocSource);
}
export function saveActiveDocSource(docSource: DocSource) {
  return electron.ipcRenderer.send(IPCMessage.SaveActiveDocSource, { docSource });
}

export function trackSignInModalOpened() {
  return electron.ipcRenderer.send(IPCMessage.TrackSignInModalOpened);
}

export function trackSignInModalClosed() {
  return electron.ipcRenderer.send(IPCMessage.TrackSignInModalClosed);
}

export function trackSignInButtonClicked() {
  return electron.ipcRenderer.send(IPCMessage.TrackSignInButtonClicked);
}

export function trackSignInAgainButtonClicked() {
  return electron.ipcRenderer.send(IPCMessage.TrackSignInAgainButtonClicked);
}

export function trackSignInFinished() {
  return electron.ipcRenderer.send(IPCMessage.TrackSignInFinished);
}

export function trackSignInFailed(error: string) {
  return electron.ipcRenderer.send(IPCMessage.TrackSignInFailed, { error });
}

export function trackContinueIntoAppButtonClicked() {
  return electron.ipcRenderer.send(IPCMessage.TrackContinueIntoAppButtonClicked);
}

export function trackSignOutButtonClicked() {
  return electron.ipcRenderer.send(IPCMessage.TrackSignOutButtonClicked);
}

export function togglePinMode(isEnabled: boolean) {
  return electron.ipcRenderer.send(IPCMessage.TogglePinMode, { isEnabled });
}

export function trackShowSearchHistory() {
  return electron.ipcRenderer.send(IPCMessage.TrackShowSearchHistory);
}

export function trackHideSearchHistory() {
  return electron.ipcRenderer.send(IPCMessage.TrackHideSearchHistory);
}

export function trackSelectHistoryQuery() {
  return electron.ipcRenderer.send(IPCMessage.TrackSelectHistoryQuery);
}

export function trackCopyCodeSnippetStackOverflow() {
  return electron.ipcRenderer.send(IPCMessage.TrackCopyCodeSnippetStackOverflow);
}

export function trackCopyCodeSnippetDocs() {
  return electron.ipcRenderer.send(IPCMessage.TrackCopyCodeSnippetDocs);
}

export function reloadMainWindow() {
  return electron.ipcRenderer.send(IPCMessage.ReloadMainWindow);
}

export function trackDismissBundleUpdate() {
  return electron.ipcRenderer.send(IPCMessage.TrackDismissBundleUpdate);
}

export function trackPerformBundleUpdate() {
  return electron.ipcRenderer.send(IPCMessage.TrackPerformBundleUpdate);
}

export { isDev };

/*
export function retrieveQuery() {
  dispatchMessage('Invoke', 'Store', { action: 'get', key: 'searchQuery' });
}

export function saveQuery(value: string) {
  dispatchMessage('Invoke', 'Store', { action: 'set', key: 'searchQuery', value });
}

export function dispatchMessage(ipc: 'Send' | 'Invoke', msgType: 'Store' | 'Auth' | 'Interface', data: any = undefined) {
  const payload = {
    type: msgType,
    data: {}
  };

  if (ipc === 'Send')
    return electron.ipcRenderer.send('renderer_message', payload);
  else
    return electron.ipcRenderer.invoke('renderer_message', payload);
}
*/

export default electron;

