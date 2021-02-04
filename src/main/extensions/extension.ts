import { fork, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import isDev from '../utils/isDev';
import { app } from 'electron';

import {
  ExtensionRequestType,
  ExtensionStatus,
  FromExtensionMessage,
  ExtensionMessageType,
  ResponseMessage,
  StatusMessage,
  RequestMessage,
  RequestDataMap,
  ResponseDataMap,
  Source,
} from './message';

interface StatusListener<D> {
  (message: StatusMessage<D>): void;
}

export class Extension {
  private extensionProcess: ChildProcess;
  private statusEmitter = new EventEmitter();
  private isExtensionProcessReady = false;

  public get isReady() {
    return this.isExtensionProcessReady && this.isActive;
  }

  public get isActive() {
    return !this.extensionProcess.killed;
  }

  private onStatus<D>(status: ExtensionStatus, listener: StatusListener<D>) {
    this.statusEmitter.on(status, listener);
  }

  private removeOnStatus<D>(status: ExtensionStatus, listener: StatusListener<D>) {
    this.statusEmitter.off(status, listener);
  }

  public onceExit(listener: StatusListener<void>) {
    if (this.isReady) {
      return listener({
        type: ExtensionMessageType.Status,
        status: ExtensionStatus.Exit,
        data: undefined,
      });
    }
    const onceListener = (message: StatusMessage<void>) => {
      this.removeOnStatus(ExtensionStatus.Exit, onceListener);
      listener(message);
    }
    this.onStatus(ExtensionStatus.Exit, onceListener);
  }

  public onceReady(listener: StatusListener<void>) {
    if (this.isReady) {
      return listener({
        type: ExtensionMessageType.Status,
        status: ExtensionStatus.Ready,
        data: undefined,
      });
    }
    const onceListener = (message: StatusMessage<void>) => {
      this.removeOnStatus(ExtensionStatus.Ready, onceListener);
      listener(message);
    }
    this.onStatus(ExtensionStatus.Ready, onceListener);
  }

  public async getSources() {
    const requestType = ExtensionRequestType.GetSources;

    type RequestDataType = RequestDataMap[typeof requestType];
    type ResponseDataType = ResponseDataMap[typeof requestType];

    const result = await this.handleRequest<RequestDataType, ResponseDataType>({
      requestType,
      data: {},
    });
    return result;
  }

  public async search(data: { query: string, sources?: Source[] }) {
    const requestType = ExtensionRequestType.Search;

    type RequestDataType = RequestDataMap[typeof requestType];
    type ResponseDataType = ResponseDataMap[typeof requestType];

    const result = await this.handleRequest<RequestDataType, ResponseDataType>({
      requestType,
      data,
    });
    return result;
  }

  public constructor(public extensionID: string) {
    const root = app.getAppPath();

    const extensionProcessPath = path.resolve(root, 'build', 'main', 'extensions', 'extensionProcess', 'index.js');
    const extensionModulePath = path.resolve(root, 'build', 'main', 'extensions', 'extensionModules', extensionID);

    this.extensionProcess = fork(extensionProcessPath, undefined, {
      stdio: isDev ? ['inherit', 'inherit', 'inherit', 'ipc'] : ['ignore', 'ignore', 'ignore', 'ipc'],
      env: {
        ...process.env,
        EXTENSION_ID: extensionID,
        EXTENSION_MODULE_PATH: extensionModulePath,
        ELECTRON_RUN_AS_NODE: '1',
      },
      detached: (process.platform === 'win32'),
    });

    this.extensionProcess.on('message', <D>(message: FromExtensionMessage<D>) => {
      if (message.type === ExtensionMessageType.Status) this.statusEmitter.emit(message.status, message);
    });

    this.onceReady(() => {
      this.isExtensionProcessReady = true;
    });

    this.onceExit(() => {
      this.terminate();
    });
  }

  public terminate() {
    this.extensionProcess.kill();
  }

  private waitForResponse<D>(id: string) {
    return new Promise<ResponseMessage<D>>((resolve, reject) => {
      const ipcHandle = (message: FromExtensionMessage<D>) => {
        if (message.type === ExtensionMessageType.Status || message.type === ExtensionMessageType.ErrorStatus) return;
        if (message.id === id) {
          this.extensionProcess.off('message', ipcHandle);
          switch (message.type) {
            case ExtensionMessageType.Response:
              return resolve(message);
            case ExtensionMessageType.ErrorResponse:
              return reject(message.data);
            default:
              return reject('Unknown message type');
          }
        }
      }
      this.extensionProcess.on('message', ipcHandle);
    });
  }

  private async handleRequest<I, O>(requestOptions: Pick<RequestMessage<I>, 'data' | 'requestType'>) {
    if (!this.isActive) {
      throw new Error(`Extension "${this.extensionID}" is not running`);
    }
    const id = uuidv4();
    const response = this.waitForResponse<O>(id);
    const request: RequestMessage<I> = {
      ...requestOptions,
      type: ExtensionMessageType.Request,
      id,
    };

    this.extensionProcess.send(request);
    return (await response).data;
  }
}
