import React from 'react';
import styled from 'styled-components';

import { openLink } from 'mainProcess';
import { CodeResult, FilePreview } from 'search/gitHub';
import Modal from 'components/Modal';
import { ReactComponent as externalLinkImg } from 'img/external-link.svg';

import Code from './Code';

const marginTop = 60;

const StyledModal = styled(Modal)`
  width: 100%;
  height: calc(100vh - ${marginTop}px);
  margin-top: ${marginTop}px;

  background: #1C1B26;
  border-radius: 20px 20px 0 0;
`;

const StyledCode = styled(Code)`
  height: calc(100% - ${marginTop}px);
`;

const Header = styled.div`
  width: 100%;
  max-width: 100%;
  padding: 10px;

  display: flex;
  overflow: hidden;
  flex-direction: column;

  border-radius: 5px 5px 0 0;
  background: #3A41AF;
  box-shadow: 0 -10px 20px rgba(0, 0, 0, 0.15);
`;

const RepoName = styled.div`
  margin-bottom: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  color: #fff;
  font-weight: 500;
  font-size: 13px;
`;

const FilePathWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const FilePath = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  direction: rtl; // This so we can see the name of the file.
  text-align: left;

  color: #fff;
  font-weight: 600;
  font-size: 14px;
`;

const ExternalLinkButton = styled.button`
  position: relative;
  top: 2px;

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

interface CodeModalProps {
  codeResult: CodeResult;
  onCloseRequest: () => void;
}

function CodeModal({
  codeResult,
  onCloseRequest,
}: CodeModalProps) {
  const filePreview: FilePreview = {
    indices: codeResult.absoluteIndices,
    fragment: codeResult.fileContent,
    startLine: 1,
  };

  function handleOpenExternalLinkButton() {
    openLink(codeResult.fileURL);
  }

  return (
    <StyledModal
      onCloseRequest={onCloseRequest}
    >
      <Header>
        <RepoName>
          {codeResult.repoFullName}
        </RepoName>

        <FilePathWrapper>
          <FilePath>
            {codeResult.filePath}
          </FilePath>
          <ExternalLinkButton onClick={handleOpenExternalLinkButton}>
            <ExternalLinkImg />
          </ExternalLinkButton>
        </FilePathWrapper>
      </Header>

      <StyledCode
        filePreview={filePreview}
        isFocused={true}
        isInModal={true}
      />

    </StyledModal>
  );
}

export default CodeModal;
