import React, {
  useState,
  useEffect,
} from 'react';
import styled from 'styled-components';

import { useHotkeys } from 'react-hotkeys-hook';
import useIPCRenderer from 'hooks/useIPCRenderer';

const Input = styled.input`
  padding: 10px 15px;
  flex: 1;

  color: white;
  font-family: 'Roboto Mono';
  font-weight: 600;
  font-size: 14px;

  border: none;
  outline: none;
  background: transparent;

  ::placeholder {
    color: #5A5A6F;
  }
`;

interface SearchInputProps {
  placeholder?: string;
  onChange: (value: string) => void;
  invokeSearch: (query: string) => void;

  inputRef: React.RefObject<HTMLInputElement>;

  isModalOpened?: boolean;
  isSignInModalOpened?: boolean;
  isDocsFilterModalOpened?: boolean;

  onInputFocusChange: (isFocused: boolean) => void;
}

function SearchInput({
  placeholder,
  inputRef,
  onChange,
  isModalOpened,
  invokeSearch,
  isSignInModalOpened,
  isDocsFilterModalOpened,
  onInputFocusChange,
}: SearchInputProps) {
  const [value, setValue] = useState('');
  const [lastValue, setLastValue] = useState('');

  function handleChangeValue(e: any) {
    setValue(e.target.value);
  }

  function handleInputKeyDown(e: any) {
    // We want to prevent cursor from moving when the up or down arrow is pressed.
    // The default behavior is that cursor moves either to the start or to the end.
    // 38 - up arrow 
    // 40 - down arrow
    if (e.keyCode === 38 || e.keyCode === 40) {
      e.preventDefault();
      return;
    }
  }

  // 'enter' hotkey - search.
  useHotkeys('enter', (event) => {
    if (lastValue === value) return;

    invokeSearch(value);
    setLastValue(value);
  }, { filter: () => true }, [
    invokeSearch,
    value,
    lastValue,
  ]);


  useIPCRenderer('did-show-main-window', () => {
    if (!isModalOpened && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(0, 999999);
    }
  });

  useEffect(() => {
    if (isModalOpened) inputRef?.current?.blur();
    else inputRef?.current?.focus();
  }, [isModalOpened]);

  useEffect(() => {
    if (isSignInModalOpened) inputRef?.current?.blur();
    else inputRef?.current?.focus();
  }, [isSignInModalOpened]);

  useEffect(() => {
    if (isDocsFilterModalOpened) inputRef?.current?.blur();
    else inputRef?.current?.focus();
  }, [isDocsFilterModalOpened]);

  return (
    <Input
      ref={inputRef}
      placeholder={placeholder}
      value={value}
      onChange={handleChangeValue}
      onFocus={() => onInputFocusChange(true)}
      onBlur={() => onInputFocusChange(false)}
      onKeyDown={handleInputKeyDown}
    />
  );
}

export default SearchInput;
