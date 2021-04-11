import {
  autorun,
  makeAutoObservable,
  toJS,
} from 'mobx';
import { useRootStore } from 'App/RootStore';
import IPCService, { IPCOnChannel, IPCSendChannel } from 'services/ipc.service';
import ElectronService from 'services/electron.service';
import { Platform } from 'services/electron.service/platform';
import { Key } from 'components/HotkeyText';
import { SearchSource } from 'services/search.service/searchSource';
import SyncService, { StorageKey } from 'services/sync.service';

export function useUIStore() {
  const { uiStore } = useRootStore();
  return uiStore;
}

export enum HotkeyAction {
  Search,
  ToggleHistory,
  HistoryUp,
  HistoryDown,
  SearchHistory,
  SelectStackOverflowSource,
  SelectDocsSource,
  TogglePinMode,
  StackOverflowScrollUp,
  StackOverflowScrollDown,
  StackOverflowModalScrollUp,
  StackOverflowModalScrollDown,
  StackOverflowResultsUp,
  StackOverflowResultsDown,
  StackOverflowOpenModal,
  StackOverflowCloseModal,
  StackOverflowModalOpenInBrowser,
  StackOverflowOpenInBrowser,
  DocsScrollUp,
  DocsScrollDown,
  DocsResultsUp,
  DocsResultsDown,
  DocsModalFilterDown,
  DocsModalFilterUp,
  DocsModalFilterSelect,
  DocsOpenModalFilter,
  DocsCloseModalFilter,
  DocsCancelSearchInPage,
  DocsOpenSearchInPage,
  DocsSearchInPageUp,
  DocsSearchInPageDown,
  DocsScrollTop,
  DocsScrollBottom,
}

export type HotKeysBinding = {
  [action in HotkeyAction]: {
    hotkey: string,
    isActive: () => boolean,
    label: string[],
    handler?: () => void,
  };
}

class UIStore {
  isModalOpened = false;
  isSignInModalOpened = false;
  isSearchHistoryVisible = false;
  isPinModeEnabled = false;
  isFilterModalOpened = false;
  isSearchInPageOpened = false;
  _searchSource: SearchSource = SearchSource.StackOverflow;
  _docSearchResultsDefaultWidth: number = 300;
  _docsFilterModalQuery = '';

  hotkeys: HotKeysBinding = {
    [HotkeyAction.DocsSearchInPageDown]: {
      hotkey: 'enter',
      label: [],
      isActive: () => this.searchSource === SearchSource.Docs && this.isSearchInPageOpened,
    },
    [HotkeyAction.DocsSearchInPageUp]: {
      hotkey: 'shift+enter',
      label: [],
      isActive: () => this.searchSource === SearchSource.Docs && this.isSearchInPageOpened,
    },
    [HotkeyAction.DocsScrollBottom]: {
      ...ElectronService.platform === Platform.MacOS ? {
        hotkey: 'cmd+down',
      } : {
        hotkey: 'ctrl+down',
      },
      label: [],
      isActive: () => this.searchSource === SearchSource.Docs && !this.isFilterModalOpened,
    },
    [HotkeyAction.DocsScrollTop]: {
      ...ElectronService.platform === Platform.MacOS ? {
        hotkey: 'cmd+up',
      } : {
        hotkey: 'ctrl+up',
      },
      label: [],
      isActive: () => this.searchSource === SearchSource.Docs && !this.isFilterModalOpened,
    },
    [HotkeyAction.DocsScrollDown]: {
      hotkey: 'shift+down',
      label: [],
      isActive: () => this.searchSource === SearchSource.Docs && !this.isFilterModalOpened,
    },
    [HotkeyAction.DocsScrollUp]: {
      hotkey: 'shift+up',
      label: [],
      isActive: () => this.searchSource === SearchSource.Docs && !this.isFilterModalOpened,
    },
    [HotkeyAction.DocsOpenModalFilter]: {
      ...ElectronService.platform === Platform.MacOS ? {
        hotkey: 'cmd+d',
        label: [Key.Command, 'D'],
      } : {
        hotkey: 'ctrl+d',
        label: ['Ctrl', 'D'],
      },
      isActive: () => this.searchSource === SearchSource.Docs,
    },
    [HotkeyAction.StackOverflowOpenInBrowser]: {
      ...ElectronService.platform === Platform.MacOS ? {
        hotkey: 'cmd+o',
        label: [Key.Command, 'O'],
      } : {
        hotkey: 'alt+o',
        label: [Key.Alt, 'O'],
      },
      isActive: () => !this.isModalOpened && this.searchSource === SearchSource.StackOverflow,
    },
    [HotkeyAction.StackOverflowModalOpenInBrowser]: {
      ...ElectronService.platform === Platform.MacOS ? {
        hotkey: 'cmd+o',
        label: [Key.Command, 'O'],
      } : {
        hotkey: 'alt+o',
        label: [Key.Alt, 'O'],
      },
      isActive: () => this.isModalOpened && this.searchSource === SearchSource.StackOverflow,
    },
    [HotkeyAction.DocsCancelSearchInPage]: {
      hotkey: 'esc',
      label: ['Esc'],
      isActive: () => this.searchSource === SearchSource.Docs && this.isSearchInPageOpened && !this.isFilterModalOpened,
    },
    [HotkeyAction.DocsModalFilterSelect]: {
      hotkey: 'enter',
      label: ['Enter'],
      isActive: () => this.searchSource === SearchSource.Docs && this.isFilterModalOpened && !this.isSearchInPageOpened,
    },
    [HotkeyAction.DocsCloseModalFilter]: {
      hotkey: 'esc',
      label: ['Esc'],
      isActive: () => this.searchSource === SearchSource.Docs && this.isFilterModalOpened,
    },
    [HotkeyAction.DocsModalFilterDown]: {
      hotkey: 'down',
      label: [Key.ArrowDown],
      isActive: () => this.searchSource === SearchSource.Docs && this.isFilterModalOpened && !this.isSearchInPageOpened,
    },
    [HotkeyAction.DocsModalFilterUp]: {
      hotkey: 'up',
      label: [Key.ArrowUp],
      isActive: () => this.searchSource === SearchSource.Docs && this.isFilterModalOpened && !this.isSearchInPageOpened,
    },
    [HotkeyAction.DocsResultsDown]: {
      hotkey: 'down',
      label: [Key.ArrowDown],
      isActive: () => this.searchSource === SearchSource.Docs && !this.isFilterModalOpened && !this.isSearchInPageOpened,
    },
    [HotkeyAction.DocsResultsUp]: {
      hotkey: 'up',
      label: [Key.ArrowUp],
      isActive: () => this.searchSource === SearchSource.Docs && !this.isFilterModalOpened && !this.isSearchInPageOpened,
    },
    [HotkeyAction.DocsScrollDown]: {
      hotkey: 'down',
      label: [Key.ArrowDown],
      isActive: () => this.searchSource === SearchSource.Docs && !this.isSearchInPageOpened && !this.isFilterModalOpened,
    },
    [HotkeyAction.DocsScrollUp]: {
      hotkey: 'up',
      label: [Key.ArrowUp],
      isActive: () => this.searchSource === SearchSource.Docs && !this.isSearchInPageOpened && !this.isFilterModalOpened,
    },
    [HotkeyAction.DocsOpenSearchInPage]: {
      ...ElectronService.platform === Platform.MacOS ? {
        hotkey: 'cmd+f',
        label: [Key.Command, 'F'],
      } : {
        hotkey: 'ctrl+o',
        label: ['Control', 'F'],
      },
      isActive: () => this.searchSource === SearchSource.Docs && !this.isSearchInPageOpened && !this.isFilterModalOpened,
    },
    [HotkeyAction.StackOverflowOpenModal]: {
      hotkey: 'shift+enter',
      label: [Key.Shift, Key.Enter],
      isActive: () => !this.isModalOpened && this.searchSource === SearchSource.StackOverflow,
    },
    [HotkeyAction.StackOverflowCloseModal]: {
      hotkey: 'esc',
      label: ['Esc'],
      isActive: () => this.isModalOpened && this.searchSource === SearchSource.StackOverflow,
    },
    [HotkeyAction.StackOverflowScrollUp]: {
      hotkey: 'shift+up',
      label: [Key.Shift, Key.ArrowUp],
      isActive: () => !this.isModalOpened && this.searchSource === SearchSource.StackOverflow,
    },
    [HotkeyAction.StackOverflowScrollDown]: {
      hotkey: 'shift+down',
      label: [Key.Shift, Key.ArrowDown],
      isActive: () => !this.isModalOpened && this.searchSource === SearchSource.StackOverflow,
    },
    [HotkeyAction.StackOverflowResultsUp]: {
      hotkey: 'up',
      label: [Key.ArrowUp],
      isActive: () => !this.isModalOpened && this.searchSource === SearchSource.StackOverflow,
    },
    [HotkeyAction.StackOverflowResultsDown]: {
      hotkey: 'down',
      label: [Key.ArrowDown],
      isActive: () => !this.isModalOpened && this.searchSource === SearchSource.StackOverflow,
    },
    [HotkeyAction.StackOverflowModalScrollUp]: {
      hotkey: 'up',
      label: [Key.ArrowUp],
      isActive: () => this.isModalOpened && this.searchSource === SearchSource.StackOverflow,
    },
    [HotkeyAction.StackOverflowModalScrollDown]: {
      hotkey: 'down',
      label: [Key.ArrowDown],
      isActive: () => this.isModalOpened && this.searchSource === SearchSource.StackOverflow,
    },
    [HotkeyAction.Search]: {
      hotkey: 'Enter',
      label: ['Enter'],
      isActive: () => !this.isSearchHistoryVisible && !this.isFilterModalOpened,
    },
    [HotkeyAction.SearchHistory]: {
      hotkey: 'Enter',
      label: ['Enter'],
      isActive: () => this.isSearchHistoryVisible && !this.isFilterModalOpened,
    },
    [HotkeyAction.ToggleHistory]: {
      hotkey: 'Tab',
      label: ['Tab'],
      isActive: () => !this.isModalOpened && !this.isFilterModalOpened,
    },
    [HotkeyAction.HistoryUp]: {
      hotkey: 'up',
      label: [Key.ArrowUp],
      isActive: () => this.isSearchHistoryVisible,
    },
    [HotkeyAction.HistoryDown]: {
      hotkey: 'down',
      label: [Key.ArrowDown],
      isActive: () => this.isSearchHistoryVisible,
    },
    [HotkeyAction.TogglePinMode]: {
      ...ElectronService.platform === Platform.MacOS ? {
        hotkey: 'cmd+shift+p',
        label: [Key.Command, Key.Shift, 'P'],
      } : {
        hotkey: 'alt+shift+p',
        label: [Key.Alt, Key.Shift, 'P'],
      },
      isActive: () => true,
    },
    [HotkeyAction.SelectStackOverflowSource]: {
      ...ElectronService.platform === Platform.MacOS ? {
        hotkey: 'cmd+1',
        label: [Key.Command, '1'],
      } : {
        hotkey: 'alt+1',
        label: [Key.Alt, '1'],
      },
      isActive: () => true,
    },
    [HotkeyAction.SelectDocsSource]: {
      ...ElectronService.platform === Platform.MacOS ? {
        hotkey: 'cmd+2',
        label: [Key.Command, '2'],
      } : {
        hotkey: 'alt+2',
        label: [Key.Alt, '2'],
      },
      isActive: () => true,
    },
  };

  registerHotkeyHandler(action: HotkeyAction, handler: () => void) {
    this.hotkeys[action].handler = handler;
  }

  constructor() {
    makeAutoObservable(this);

    IPCService.on(IPCOnChannel.OpenSignInModal, () => {
      this.isSignInModalOpened = true;
    });

    this.sync().then(() => this.backup());
  }

  set docsFilterModalQuery(value: string) {
    this._docsFilterModalQuery = value;
  }

  get docsFilterModalQuery() {
    return this._docsFilterModalQuery;
  }

  get docSearchResultsDefaultWidth() {
    return this._docSearchResultsDefaultWidth;
  }

  set docSearchResultsDefaultWidth(value: number) {
    this._docSearchResultsDefaultWidth = value;
  }

  toggleSearchInPage() {
    this.isSearchInPageOpened = !this.isSearchInPageOpened;
  }

  toggleModal() {
    this.isModalOpened = !this.isModalOpened;
  }

  toggleFilterModal() {
    this.isFilterModalOpened = !this.isFilterModalOpened;
  }

  toggleSignInModal() {
    this.isSignInModalOpened = !this.isSignInModalOpened;
  }

  toggleSeachHistory() {
    this.isSearchHistoryVisible = !this.isSearchHistoryVisible;
  }

  togglePinMode() {
    this.isPinModeEnabled = !this.isPinModeEnabled;
    IPCService.send(IPCSendChannel.TogglePinMode, { isEnabled: this.isPinModeEnabled });
  }

  set searchSource(value: SearchSource) {
    this._searchSource = value;
  }

  get searchSource() {
    return this._searchSource;
  }

  private async sync() {
    const searchSource = await SyncService.get(StorageKey.SearchFilter);
    this.searchSource = searchSource;
  }

  private backup() {
    SyncService.registerBackup(StorageKey.SearchFilter, () => this.searchSource);
  }

}

export default UIStore;