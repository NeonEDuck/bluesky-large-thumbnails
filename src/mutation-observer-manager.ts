import { globalVariables } from "./global";

export class MutationObserverManager {
    #observers: Record<string, {observer: MutationObserver, additionalContext?: Record<string, {}>}[]> = {}
    constructor() {
    }

    public new(callback: MutationCallback, tag: string, additionalContext?: Record<string, {}>) {
        const observer = new MutationObserver(callback);
        const observerListOfTag = this.#observers[tag]
        if (!observerListOfTag) {
            this.#observers[tag] = [{observer, additionalContext}];
        }
        else {
            observerListOfTag.push({observer, additionalContext})
        }
        this.refreshDebugPanel();

        return observer;
    }

    public destroy(observer: MutationObserver) {
        observer.disconnect();

        // Find the observer in observer record, with it's tag and index within the sub list
        const result = Object.entries(this.#observers)
            .flatMap(([tag, records]) => records.map((value, idx) => ({tag, value, idx})))
            .find(({value}) => value.observer == observer);

        if (!result) {
            throw new Error('Observer not found, cannot destroy observer. Maybe it is already destroyed?')
        }

        this.#observers[result.tag]?.splice(result.idx, 1);

        this.refreshDebugPanel();
    }

    private refreshDebugPanel() {
        if (!globalVariables.debugPanel) {
            return;
        }

        globalVariables.debugPanel.innerHTML = Object.entries(this.#observers)
            .map(([tag, observers]) => `[${tag}] observer count: ${observers.filter(item => item != undefined).length}`)
            .join('\n');
    }
}