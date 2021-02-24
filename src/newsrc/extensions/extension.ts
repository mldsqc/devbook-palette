import { v4 as uuidv4 } from 'uuid';
import type { ChildProcess } from 'child_process';
import {
  Event,
  Status,
  FromExtensionMessage,
  Message,
  EventReturnMessage,
  StatusMessage,
  EventMessage,
  EventInput,
  EventOutput,
} from '@devbookhq/extension';
import { makeAutoObservable, runInAction } from 'mobx';

import { isDev } from '../../mainCommunication/electron'
import { ExtensionID } from './extensionID';
import { events, path, childProcess, app } from '../electronRemote';
import type ExtensionsStore from './extensions.store';
import { killExtensionProcess, registerExtensionProcess, unregisterExtensionProcess } from './extension.ipc';

interface StatusListener<D> {
  (message: StatusMessage<D>): void;
}

class Extension {
  readonly _extensionProcess: ChildProcess;
  readonly _statusEmitter = new events.EventEmitter();

  isReady = false;

  get isActive() {
    return !this._extensionProcess.killed;
  }

  constructor(readonly _extensionStore: ExtensionsStore, readonly extensionID: ExtensionID) {
    makeAutoObservable(this, {
      _extensionStore: false,
      _extensionProcess: false,
      _statusEmitter: false,

      extensionID: false,

      onceExit: false,
      onceReady: false,

      onStatus: false,
      removeOnStatus: false,

      getSources: false,
      search: false,

      terminate: false,

      waitForEvent: false,
      handleEvent: false,
    });

    const root = app.getAppPath();
    const extensionProcessPath = require.resolve('@devbookhq/extension');
    const extensionModulePath = path.resolve(root, 'build', 'main', 'extensions', 'defaultExtensions', extensionID);

    this._extensionProcess = childProcess.fork(extensionProcessPath, undefined, {
      stdio: isDev ? ['inherit', 'inherit', 'inherit', 'ipc'] : ['ignore', 'ignore', 'ignore', 'ipc'],
      env: {
        ...process.env,
        EXTENSION_ID: extensionID,
        EXTENSION_MODULE_PATH: extensionModulePath,
        ELECTRON_RUN_AS_NODE: '1',
      },
      detached: process.platform === 'win32',
    });
    registerExtensionProcess(this._extensionProcess.pid);

    this._extensionProcess.on('message', <D>(message: FromExtensionMessage<D>) => {
      if (message.type === Message.Status) this._statusEmitter.emit(message.status, message);
    });

    this.onceReady(() => {
      runInAction(() => {
        this.isReady = true;
      });
    });

    this.onceExit(() => {
      unregisterExtensionProcess(this._extensionProcess.pid);
      this.terminate();
    });
  }

  onStatus<D>(status: Status, listener: StatusListener<D>) {
    this._statusEmitter.on(status, listener);
  }

  removeOnStatus<D>(status: Status, listener: StatusListener<D>) {
    this._statusEmitter.off(status, listener);
  }

  onceExit(listener: StatusListener<void>) {
    if (this.isReady) {
      return listener({
        type: Message.Status,
        status: Status.Exit,
        data: undefined,
      });
    }
    const onceListener = (message: StatusMessage<void>) => {
      this.removeOnStatus(Status.Exit, onceListener);
      listener(message);
    }
    this.onStatus(Status.Exit, onceListener);
  }

  onceReady(listener: StatusListener<void>) {
    if (this.isReady) {
      return listener({
        type: Message.Status,
        status: Status.Ready,
        data: undefined,
      });
    }
    const onceListener = (message: StatusMessage<void>) => {
      this.removeOnStatus(Status.Ready, onceListener);
      listener(message);
    }
    this.onStatus(Status.Ready, onceListener);
  }

  async getSources() {
    const eventType = Event.getSources;

    type CurrentEventInput = EventInput[typeof eventType];
    type CurrentEventOutput = EventOutput[typeof eventType];

    return this.handleEvent<CurrentEventInput, CurrentEventOutput>({
      eventType,
      data: {},
    });
  }

  async search(data: EventInput[Event.onDidQueryChange]) {
    const eventType = Event.onDidQueryChange;

    type CurrentEventInput = EventInput[typeof eventType];
    type CurrentEventOutput = EventOutput[typeof eventType];

    return this.handleEvent<CurrentEventInput, CurrentEventOutput>({
      eventType,
      data,
    });
  }

  terminate() {
    killExtensionProcess(this._extensionProcess.pid);
  }

  async waitForEvent<D>(id: string) {
    return new Promise<EventReturnMessage<D>>((resolve, reject) => {
      const messageHandler = (message: FromExtensionMessage<D>) => {
        if (message.type !== Message.EventReturn && message.type !== Message.EventError) return;
        if (message.id === id) {
          this._extensionProcess.off('message', messageHandler);
          switch (message.type) {
            case Message.EventReturn:
              return resolve(message);
            case Message.EventError:
              return reject(message.data);
            default:
              return reject('Unknown message type.');
          }
        }
      }
      this._extensionProcess.on('message', messageHandler);
    });
  }

  async handleEvent<I, O>(options: Pick<EventMessage<I>, 'data' | 'eventType'>) {
    if (!this.isActive) throw new Error(`Extension "${this.extensionID}" is not running.`);

    const id = uuidv4();
    const eventReturn = this.waitForEvent<O>(id);
    const eventMessage: EventMessage<I> = {
      ...options,
      type: Message.Event,
      id,
    };

    this._extensionProcess.send(eventMessage);
    return (await eventReturn).data;
  }
}

export default Extension;
