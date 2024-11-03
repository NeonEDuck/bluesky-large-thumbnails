import { MutationObserverManager } from "./mutation-observer-manager";

export type globalVariablesType = {
    debugPanel?: HTMLElement,
    isInDebugMode: boolean,
    mutationObserverManager: MutationObserverManager
};

export const globalVariables: globalVariablesType = {
    debugPanel: undefined,
    isInDebugMode: false,
    mutationObserverManager: new MutationObserverManager(),
}