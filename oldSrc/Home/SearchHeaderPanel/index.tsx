import React, {
  useRef,
  useState,
  useEffect,
} from 'react';
import styled from 'styled-components';
import { useHotkeys } from 'react-hotkeys-hook';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import { useUIStore } from 'ui/ui.store';
import useIPCRenderer from 'hooks/useIPCRenderer';
import electron, {
  openPreferences,
  isDev,
  getUpdateStatus,
  restartAndUpdate,
  postponeUpdate,
  togglePinMode,
} from 'mainCommunication';
import { PreferencesPage } from 'Preferences';
import { IPCMessage } from 'mainCommunication/ipc';

import { ResultsFilter } from './ResultsFiltersMenu';
import SearchInput from './SearchInput';

import Hotkey, { Key } from '../HotkeysPanel/Hotkey';

import { ReactComponent as preferencesIcon } from 'img/preferences.svg';
import { ReactComponent as closeIcon } from 'img/close.svg';
import { SearchMode } from 'Preferences/Pages/searchMode';
import { DocSource } from 'Search/docs';
import {SearchSource} from 'Search';

const Container = styled.div`
  width: 100%;
  padding-top: 10px;
  display: flex;
  flex-direction: column;

  border-bottom: 1px solid #3B3A4A;
  background: #25252E;
`;

const InputSection = styled.div`
  display: flex;
  align-items: center;
`;

const Menu = styled.div`
  width: 100%;
  padding: 12px 15px;

  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

const PreferencesIcon = styled(preferencesIcon)`
  height: auto;
  width: 20px;

  path {
    height: 1px;
    width: auto;
  }
`;

const PreferencesButton = styled.div`
  margin: 0 5px 0 0;

  display: flex;

  :hover {
    path {
      stroke: white;
    }
    cursor: pointer;
  }
`;

const Dev = styled.span`
  margin: 0 10px;
  color: #00FF41;
  font-family: 'Roboto Mono';
  font-weight: 400;
`;

const UpdatePanel = styled.div`
  height: 38px;
  width: 100%;

  display: flex;
  justify-content: space-between;

  background: #7739DD;
`;

const Disclaimer = styled.div`
  font-size: 16px;
  font-weight: 500;
  margin: auto 15px;

  :hover {
    cursor: pointer;
  }
`;

const CancelButton = styled.div`
  margin: auto 15px;

  :hover {
    cursor: pointer;
    path {
      stroke: #FFFFFF;
    }
  }
`;

const CloseIcon = styled(closeIcon)`
  width: auto;
  height: 18px;
  display: block;
  path {
    stroke: #FFFFFF;
  }
`;

const SearchInputContainer = styled.div<{ isFocused?: boolean }>`
  min-height: 58px;
  width: 100%;
  padding-bottom: 8px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  border-bottom: 1px solid #3B3A4A;
`;

const PinWrapper = styled.div`
  margin-right: 10px;
  display: flex;
  align-items: center;
`;


const PinButton = styled.button<{ isActive?: boolean }>`
  color: ${props => props.isActive ? 'white' : '#616171'};
  font-family: 'Poppins';
  font-size: 12px;

  background: none;
  border: none;

  :hover {
    transition: background 170ms ease-in;
    cursor: pointer;
    color: white;
  }
`;

const Filter = styled.div`
  margin-right: 10px;
  display: flex;
  align-items: center;
`;

const FilterButton = styled.button<{ selected?: boolean }>`
  color: ${props => props.selected ? 'white' : '#616171'};
  font-family: 'Poppins';
  font-size: 13px;
  font-weight: 400;

  background: none;
  border: none;

  :hover {
    transition: background 170ms ease-in;
    cursor: pointer; color: white;
  }
`;


const InputLoaderContainer = styled.div`
  padding-right: 4px;
  margin-right: 8px;
  flex: 1;
  display: flex;
  align-items: center;
  border-right: 1px solid #3B3A4A;
`;

const HotkeyWrapper = styled.div`
  padding: 5px;
  display: flex;
  align-items: center;

  border-radius: 5px;
  user-select: none;
  :hover {
    transition: background 170ms ease-in;
    cursor: pointer;
    background: #434252;
    > div {
      color: #fff;
    }
  }
`;

const HotkeyText = styled.div`
  margin-left: 8px;
  font-size: 12px;
  color: #616171;
  transition: color 170ms ease-in;
`;

interface SearchHeaderPanelProps {
  placeholder?: string;

  onEmptyQuery: () => void;
  onNonEmptyQuery: () => void;
  //activeFilter: ResultsFilter;
  onInputFocusChange: (isFocused: boolean) => void;
  onToggleSearchHistoryClick: (e: any) => void;
  invokeSearch: (query: string) => void;

  isSearchHistoryPreviewVisible: boolean;
  activeDocSource: DocSource | undefined;
  searchMode: SearchMode | undefined;
  isLoading?: boolean;
  isModalOpened?: boolean;
  isDocsFilterModalOpened?: boolean;
  historyValue: string | undefined;
  onEnterInSearchHistory: () => void;
  onQueryDidChange: () => void;
}

const SearchHeaderPanel = observer(({
  placeholder,
  invokeSearch,
  onQueryDidChange,
  activeDocSource,
  //activeFilter,
  isSearchHistoryPreviewVisible,
  onEmptyQuery,
  historyValue,
  isLoading,
  onNonEmptyQuery,
  isModalOpened,
  onEnterInSearchHistory,
  searchMode,
  isDocsFilterModalOpened,
  onInputFocusChange,
  onToggleSearchHistoryClick,
}: SearchHeaderPanelProps) => {

  const uiStore = useUIStore();
  const history = useHistory();
  const { url } = useRouteMatch();

  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdatePanelOpened, setIsUpdatePanelOpened] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPinModeEnabled, setIsPinModeEnabled] = useState(false);

  function handleContentMouseDown(e: any) {
    // Prevent blur when user is clicking on the filter buttons under the input element.
    // This also makes sure that user can select text in the input field using their mouse.
    if (!e.target.contains(inputRef?.current)) {
      if (isInputFocused) e.preventDefault();
    }
  };

  function handleUpdate() {
    restartAndUpdate('banner');
  }

  function handleCloseUpdatePanel() {
    setIsUpdatePanelOpened(false);
    postponeUpdate();
  }

  function handlePinButtonClick() {
    togglePinMode(!isPinModeEnabled);
    setIsPinModeEnabled(v => !v);
  }

  function handleHotkeyClick(filter: ResultsFilter) {
    // TODO: Use SearchSource instead of ResultsFilter.
    const source = filter === ResultsFilter.StackOverflow ? SearchSource.Stack : SearchSource.Docs
    history.push(`${url}/${source}`);
  }

  function getResultsFilterDisplayName(resultsFilter: ResultsFilter) {
    if (resultsFilter === ResultsFilter.StackOverflow) { return 'Stack Overflow'; }
    return resultsFilter;
  }

  function handleInputFocusChange(isFocused: boolean) {
    setIsInputFocused(isFocused);
    onInputFocusChange(isFocused);
  }

  useIPCRenderer('update-available', (_, { isReminder }: { isReminder?: boolean }) => {
    setIsUpdateAvailable(true);
    if (isReminder) {
      setIsUpdatePanelOpened(true);
    }
  });

  useIPCRenderer(IPCMessage.OnPinModeChange, (_, { isEnabled }: { isEnabled: boolean }) => {
    setIsPinModeEnabled(isEnabled);
  });

  useEffect(() => {
    async function checkUpdateStatus() {
      const isNewUpdateAvailable = await getUpdateStatus();
      if (isNewUpdateAvailable) {
        setIsUpdateAvailable(true);
      }
    }
    checkUpdateStatus();
  }, []);

  useHotkeys(electron.remote.process.platform === 'darwin' ? 'cmd+shift+p' : 'alt+shift+p', () => {
    togglePinMode(!isPinModeEnabled);
    setIsPinModeEnabled(v => !v);
  }, { filter: () => true }, [isPinModeEnabled, setIsPinModeEnabled]);

  return (
    <Container
      onMouseDown={handleContentMouseDown}
    >
      <SearchInputContainer
        isFocused={isInputFocused}
      >
        <InputLoaderContainer>
          <SearchInput
            activeDocSource={activeDocSource}
            onNonEmptyQuery={onNonEmptyQuery}
            onEmptyQuery={onEmptyQuery}
            isSearchHistoryPreviewVisible={isSearchHistoryPreviewVisible}
            inputRef={inputRef}
            isLoading={isLoading}
            onQueryDidChange={onQueryDidChange}
            historyValue={historyValue}
            onEnterInSearchHistory={onEnterInSearchHistory}
            searchMode={searchMode}
            onInputFocusChange={handleInputFocusChange}
            invokeSearch={invokeSearch}
            placeholder={placeholder}
            isModalOpened={isModalOpened}
            isDocsFilterModalOpened={isDocsFilterModalOpened}
          />

          <HotkeyWrapper
            onClick={onToggleSearchHistoryClick}
          >
            <Hotkey
              hotkey={['Tab']}
            />
            <HotkeyText>
              to show history
            </HotkeyText>
          </HotkeyWrapper>
        </InputLoaderContainer>
        <InputSection>
          {Object.values(ResultsFilter).map((f, idx) => (
            <Filter
              key={f}
            >
              <FilterButton
                //selected={activeFilter === f}
                onClick={() => handleHotkeyClick(f)}
              >{getResultsFilterDisplayName(f)}
              </FilterButton>
              {electron.remote.process.platform === 'darwin' &&
                <Hotkey
                  hotkey={[Key.Command, `${idx + 1}`]}
                />
              }
              {electron.remote.process.platform !== 'darwin' &&
                <Hotkey
                  hotkey={['Alt + ', `${idx + 1}`]}
                />
              }
            </Filter>
          ))}
        </InputSection>
      </SearchInputContainer>

      <Menu>
        {isDev && <Dev>[dev build]</Dev>}
        <PinWrapper>
          <Hotkey
            hotkey={electron.remote.process.platform === 'darwin'
              ? [Key.Command, Key.Shift, 'P']
              : ['Alt', Key.Shift, 'P']
            }
          />
          <PinButton
            isActive={isPinModeEnabled}
            onClick={handlePinButtonClick}
          >
            to {isPinModeEnabled ? 'unpin' : 'pin'} Devbook
          </PinButton>
        </PinWrapper>
        <PreferencesButton onClick={() => openPreferences(PreferencesPage.General)}>
          <PreferencesIcon />
        </PreferencesButton>
      </Menu>

      {isUpdateAvailable && isUpdatePanelOpened &&
        <UpdatePanel>
          <Disclaimer onClick={handleUpdate}>
            {'New version is available. Click here to update & restart.'}
          </Disclaimer>
          <CancelButton
            onClick={handleCloseUpdatePanel}
          >
            <CloseIcon />
          </CancelButton>
        </UpdatePanel>
      }
    </Container>
  );
});

export { ResultsFilter };

export default SearchHeaderPanel;