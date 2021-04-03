import React from 'react';

import electron from 'mainCommunication';
import { Key, VisualConcat } from '../Hotkey';
import Panel from '../Panel';

const cmdModifier = electron.remote.process.platform === 'darwin' ? Key.Command : 'Ctrl';

interface SearchHotkeysPanelProps {
  onNavigateUpClick: (e: any) => void;
  onNavigateDownClick: (e: any) => void;
  isDocsFilterModalOpened: boolean;
  isSearchingInDocPage: boolean;
  onCloseFilterDocsClick: (e: any) => void;
  onSearchInDocPageClick: (e: any) => void;
  onCancelSearchInDocPageClick: (e: any) => void;
}

function SearchHotkeysPanel({
  onNavigateUpClick,
  onNavigateDownClick,
  isDocsFilterModalOpened,
  isSearchingInDocPage,
  onCloseFilterDocsClick,
  onSearchInDocPageClick,
  onCancelSearchInDocPageClick,
}: SearchHotkeysPanelProps) {
  return (
    <Panel
      hotkeysLeft={isDocsFilterModalOpened ? [
        {
          text: 'Navigate',
          hotkey: [Key.ArrowUp, Key.ArrowDown],
          isSeparated: true
        },
        // TODO: Change functionality based on whether the currently select
        // documentation is included or removed from the search.
        {
          text: 'Select',
          hotkey: [Key.Enter],
        },
      ] : [
          {
            text: 'Previous result',
            hotkey: [Key.ArrowUp],
            onClick: onNavigateUpClick,
          },
          {
            text: 'Next result',
            hotkey: [Key.ArrowDown],
            onClick: onNavigateDownClick,
          },
        ]}
      hotkeysRight={isDocsFilterModalOpened ? [
        {
          text: 'Close',
          hotkey: ['ESC'],
          onClick: onCloseFilterDocsClick,
        }
      ] : [
          {
            text: 'Scroll docs page',
            hotkey: [Key.Shift, Key.ArrowUp, Key.ArrowDown],
          },
          {
            text: isSearchingInDocPage ? 'Cancel search in page' : 'Search in page',
            hotkey: isSearchingInDocPage ? ['ESC'] : [cmdModifier, 'F'],
            onClick: isSearchingInDocPage ? onCancelSearchInDocPageClick : onSearchInDocPageClick,
          },
        ]}
    />
  );
}

export default SearchHotkeysPanel;