import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';
import { useHotkeys } from 'react-hotkeys-hook';

import {
  StackOverflowResult,
  StackOverflowAnswer,
  AnswerType,
} from 'Search/stackOverflow';
import electron, {
  openLink,
  trackCopyCodeSnippetStackOverflow,
} from 'mainCommunication';

import FocusState from '../SearchItemFocusState';
import StackOverflowBody from './StackOverflowBody';

import { ReactComponent as externalLinkImg } from 'img/external-link.svg';

const Container = styled.div<{ isFocused?: boolean }>`
  width: 100%;
  max-width: 100%;
  margin-bottom: 30px;

  display: flex;
  flex-direction: column;
  align-items: flex-start;

  border-radius: 5px;
  border: 1px solid ${props => props.isFocused ? '#3A41AF' : '#262736'};

  :hover {
    border: 1px solid ${props => props.isFocused ? '3A41AF' : '#2C2F5A'};
    #so-header {
      background: ${props => props.isFocused ? '3A41AF' : '#2C2F5A'};
    }
  }
`;

const Header = styled.div<{ isFocused?: boolean }>`
  width: 100%;
  max-width: 100%;
  padding: 10px;

  display: flex;
  justify-content: space-between;

  border-radius: 5px 5px 0 0;
  background: ${props => props.isFocused ? '#3A41AF' : '#262736'};

  :hover {
    cursor: ${props => props.isFocused ? 'default' : 'pointer'};
  }
`;

const QuestionTitleWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const QuestionTitle = styled.span`
  margin-right: 5px;

  color: #fff;
  font-weight: 600;
  font-size: 14px;
  text-decoration: underline;

  :hover {
    cursor: pointer;
  }
`;

const ExternalLinkButton = styled.button`
  position: relative;
  top: 1px;

  background: none;
  border: none;
  outline: none;

  :hover {
    path {
      stroke: #fff;
      cursor: pointer;
    }
  }
`;

const ExternalLinkImg = styled(externalLinkImg)`
  height: auto;
  width: 12px;

  path {
    stroke: #9CACC5;
  }

  :hover {
    cursor: pointer;
  }
`;

const QuestionMetadata = styled.div`
  display: flex;
  align-items: center;
`;

const QuestionVotes = styled.span`
  margin-right: 15px;

  color: #9CACC5;
  font-size: 14px;
  font-weight: 500;
`;

const QuestionDate = styled.span`
  color: #9CACC5;
  font-size: 14px;
  font-weight: 500;
`;

const Answer = styled.div`
  width: 100%;
  height: 100%;
  padding: 0 10px;
  margin-top: 10px;

  display: flex;
  flex-direction: column;
`;

const AnswerMetadata = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
`;

const AnswerTypeTag = styled.span`
  margin-right: 10px;
  padding: 5px 10px;

  color: #43D1A3;
  font-size: 14px;
  font-weight: 600;

  border-radius: 20px;
  background: rgba(67, 209, 163, 0.1);
`;

const AnswerVotes = styled.span`
  margin-right: 10px;
  padding: 5px 10px;

  color: #4395D1;
  font-size: 14px;
  font-weight: 600;

  border-radius: 20px;
  background: rgba(67, 149, 209, 0.1);
`;

const AnswerDate = styled.span`
  color: #9CACC5;
  font-size: 14px;
  font-weight: 500;
`;

const NoAnswer = styled.span`
  margin: 50px auto;
  color: #5A5A6F;
  font-size: 16px;
  font-weight: 600;
`;

interface StackOverflowItemProps {
  soResult: StackOverflowResult;
  focusState: FocusState;
  onHeaderClick: (e: any) => void;
  onTitleClick: (e: any) => void;
}

function StackOverflowItem({
  soResult,
  focusState,
  onHeaderClick,
  onTitleClick,
}: StackOverflowItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const [activeAnswer, setActiveAnswer] = useState<StackOverflowAnswer | undefined>();
  const [answerTypes, setAnswerTypes] = useState<AnswerType[]>([]);

  const [codeSnippets, setCodeSnippets] = useState<string[]>([]);
  const [codeSnippetEls, setCodeSnippetEls] = useState<HTMLElement[]>([]);
  const [copySnippetEls, setCopySnippetEls] = useState<HTMLElement[]>([]);

  function handleQuestionTitleClick(e: any) {
    onTitleClick(e);
    e.preventDefault();
  }

  function handleOpenExternalLinkButton() {
    openLink(soResult?.question.link);
  }

  function getDateString(timestamp: number) {
    const date = new Date(timestamp).toLocaleString('default', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const [dayMonth, year, time] = date.split(', ');
    if (dayMonth && year && time) {
      return `${dayMonth} '${year} at ${time}`;
    } else if (!time) {
      return `${dayMonth} '${year}`;
    } else {
      return '';
    }
  }

  useEffect(() => {
    if (focusState === FocusState.None) {
      copySnippetEls.forEach(el => {
        el.onclick = null;
        el.remove();
      });
      setCodeSnippetEls([]);
      return;
    }

    if (!bodyRef?.current) return;
    copySnippetEls.forEach(el => {
      el.onclick = null;
      el.remove();
    });
    setCodeSnippetEls([]);
    const codeSnippets = bodyRef.current.getElementsByTagName('pre');

    const snippets: string[] = [];
    const copyEls: HTMLElement[] = [];
    const snippetEls: HTMLElement[] = [];

    let idx = 0;
    for (let el of codeSnippets) {
      if (idx >= 9) return;

      el.classList.add(`code-snippet-${idx}`);

      const codeCopyEl = document.createElement('div');
      codeCopyEl.classList.add('code-copy');
      codeCopyEl.setAttribute('data-snippet', el.innerText);

      const codeCopyHotkeyEl = document.createElement('div');
      codeCopyHotkeyEl.classList.add('code-copy-hotkey');
      codeCopyHotkeyEl.innerHTML = `Alt + Shift + ${idx + 1}`;
      codeCopyHotkeyEl.setAttribute('data-snippet', el.innerText);
      codeCopyHotkeyEl.setAttribute('data-snippet-idx', `${idx}`);
      codeCopyEl.appendChild(codeCopyHotkeyEl);

      const codeCopyHotkeyTextEl = document.createElement('div');
      codeCopyHotkeyTextEl.classList.add('code-copy-hotkey-text');
      codeCopyHotkeyTextEl.innerHTML = 'to copy code snippet'
      codeCopyHotkeyTextEl.setAttribute('data-snippet', el.innerText);
      codeCopyHotkeyTextEl.setAttribute('data-snippet-idx', `${idx}`);
      codeCopyEl.appendChild(codeCopyHotkeyTextEl);

      codeCopyEl.onclick = (event: MouseEvent) => {
        const target = event.target as HTMLDivElement | undefined;
        if (!target) return;
        const snippet = target.getAttribute('data-snippet');
        const idxString = target.getAttribute('data-snippet-idx');
        if (!idxString) {
          console.error(`Could not get snippet element's idx`);
          return;
        }
        const idx = parseInt(idxString, 10);
        const snippetEl = bodyRef.current?.getElementsByClassName(`code-snippet-${idx}`)[0];
        if (snippet && snippetEl) {
          electron.clipboard.writeText(snippet);

          snippetEl.classList.add('highlight');
          setTimeout(() => {
            snippetEl.classList.remove('highlight');
          }, 180);

          trackCopyCodeSnippetStackOverflow();
        }
      };

      el.parentNode?.insertBefore(codeCopyEl, el);
      copyEls.push(codeCopyEl);
      snippets.push(el.innerText);
      snippetEls.push(el);
      idx += 1;
    }

    setCodeSnippetEls(snippetEls);
    setCopySnippetEls(copyEls);
    setCodeSnippets(snippets);
  }, [focusState, bodyRef, bodyRef.current]);

  useEffect(() => {
    const accepted = soResult.answers.filter(a => a.isAccepted === true);
    const mostUpvoted = soResult.answers.reduce((acc, val) => {
      if (!acc) return val;
      return val.votes > acc.votes ? val : acc;
    }, undefined as StackOverflowAnswer | undefined);

    if (accepted.length > 0) {
      const isMostUpvoted = mostUpvoted === accepted[0];
      setActiveAnswer(accepted[0]);
      setAnswerTypes(isMostUpvoted ? [AnswerType.Accepted, AnswerType.MostUpvoted] : [AnswerType.Accepted]);
    } else if (soResult.answers.length > 0) {
      setActiveAnswer(mostUpvoted);
      setAnswerTypes([AnswerType.MostUpvoted]);
    }
  }, [soResult]);

  useEffect(() => {
    if (focusState === FocusState.WithScroll) containerRef?.current?.scrollIntoView();
  }, [focusState]);

  useHotkeys(
    'alt+shift+1,alt+shift+2,alt+shift+3,alt+shift+4,alt+shift+5,alt+shift+6,alt+shift+7,alt+shift+8,alt+shift+9',
    (event, handler) => {
      event.preventDefault();
      if (focusState === FocusState.None) return;
      const num = parseInt(handler.shortcut.split('+').slice(-1)[0], 10); // 'shortcut' is a string 'ctrl+<num>'.
      if (num - 1 < codeSnippets.length) {
        electron.clipboard.writeText(codeSnippets[num - 1]);
        const snippetEl = codeSnippetEls[num - 1];
        snippetEl.classList.add('highlight');
        setTimeout(() => {
          snippetEl.classList.remove('highlight');
        }, 180);
        trackCopyCodeSnippetStackOverflow();
      }
  }, { filter: () => true }, [focusState, codeSnippets]);

  return (
    <Container
      ref={containerRef}
      isFocused={focusState !== FocusState.None}
    >
      <Header
        id="so-header"
        isFocused={focusState !== FocusState.None}
        onClick={onHeaderClick}
      >
        <QuestionTitleWrapper>
          <QuestionTitle
            onClick={handleQuestionTitleClick}
            dangerouslySetInnerHTML={{
              __html: soResult?.question.title ?? '',
            }}
          />
          <ExternalLinkButton onClick={handleOpenExternalLinkButton}>
            <ExternalLinkImg />
          </ExternalLinkButton>
        </QuestionTitleWrapper>

        <QuestionMetadata>
          <QuestionVotes>
            {soResult?.question.votes ?? ''} {soResult?.question.votes === 1 || soResult?.question.votes === -1 ? 'Upvote' : 'Upvotes'}
          </QuestionVotes>
          <QuestionDate>{soResult ? getDateString(soResult.question.timestamp * 1000) : ''}</QuestionDate>
        </QuestionMetadata>
      </Header>

      {activeAnswer &&
        <Answer>
          <AnswerMetadata>
            {answerTypes.map(t => (
              <AnswerTypeTag key={t}>{t}</AnswerTypeTag>
            ))}
            <AnswerVotes>
              {activeAnswer.votes} {activeAnswer.votes === 1 || activeAnswer.votes === -1 ? 'Upvote' : 'Upvotes'}
            </AnswerVotes>
            <AnswerDate>{getDateString(activeAnswer.timestamp * 1000)}</AnswerDate>
          </AnswerMetadata>

          <StackOverflowBody
            ref={bodyRef}
            html={activeAnswer.html}
          />
        </Answer>
      }

      {!activeAnswer &&
        <NoAnswer>The question has no answers</NoAnswer>
      }
    </Container>
  );
}

export default StackOverflowItem;