// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React from 'react';

import Base from 'actions/base';
import { SettingsContext } from './contexts';
import { displayName } from 'helpers/hoc';
import { StoreContext } from './contexts';
// this is a global variable / singleton that holds details on actions
const actions = {};

class KeyStore {
    constructor(store, key) {
        this.store = store;
        this.key = key;
    }

    get() {
        return this.store.get(this.key);
    }

    update(value) {
        return this.store.update(this.key, value);
    }

    set(value) {
        return this.store.set(this.key, value);
    }
}

export function withActions(Component, actionNames, keyList, noStore) {
    noStore = !!noStore;

    class Actions extends React.Component {
        constructor(props) {
            super(props);

            const { store, settings } = props;
            this.lastNotifyId = 0;
            this.actionProviders = {};
            this.state = {};
            this._state = {};
            // this is a map, we convert it to a list of action names and keys
            if (actionNames instanceof Map) {
                const newActionNames = [];
                const newKeyList = [];
                for (let [key, value] of actionNames) {
                    if (value === undefined) {
                        let functional = !(key.prototype instanceof Base);
                        if (functional) value = key.actionName;
                        else value = key.defaultKey;
                    }
                    if (value === undefined) throw "can't determine value";
                    newActionNames.push(key);
                    newKeyList.push(value);
                }
                actionNames = newActionNames;
                keyList = newKeyList;
            }
            // Ensure actionNames and keyList are arrays
            if (!Array.isArray(actionNames)) {
                actionNames = [actionNames];
            }
            if (!Array.isArray(keyList)) {
                keyList = [keyList];
            }

            this.actionNames = actionNames;
            this.keyList = [];

            for (let i = 0; i < actionNames.length; i++) {
                const actionName = actionNames[i];
                let key = keyList[i];

                let ActionProvider;
                let actionProvider;
                let functional = false;

                if (actionName.prototype instanceof Base) {
                    ActionProvider = actionName;
                } else if (actionName instanceof Function) {
                    // this is a function-based action
                    ActionProvider = actionName;
                    functional = true;
                } else {
                    throw new Error(`unknown action type: ${actionName}`);
                }

                if (key === undefined) {
                    if (functional) key = ActionProvider.actionName;
                    else key = ActionProvider.defaultKey;
                }

                if (key === undefined) {
                    throw "can't determine key";
                }

                const actionKey = actionName + ':' + key;
                let actionNameKey = 'Actions';

                if (functional) actionNameKey = 'Action';

                if (actions[actionKey] === undefined) {
                    if (functional) {
                        const keyStore = new KeyStore(store, key);
                        if (
                            ActionProvider.init !== undefined &&
                            keyStore.get() === undefined
                        ) {
                            const initialValue = ActionProvider.init(
                                keyStore,
                                settings
                            );
                            store.set(key, initialValue);
                        }
                        const wrapper = function() {
                            const state = store.get(key);
                            try {
                                const result = ActionProvider(
                                    state,
                                    keyStore,
                                    settings,
                                    ...arguments
                                );

                                if (result instanceof Promise) {
                                    result
                                        .then(
                                            data =>
                                                data !== undefined &&
                                                data !== null &&
                                                store.set(key, data)
                                        )
                                        .catch(
                                            error =>
                                                error !== undefined &&
                                                error !== null &&
                                                store.set(key, error)
                                        );
                                    return result;
                                } else if (
                                    result !== undefined &&
                                    result !== null
                                ) {
                                    store.set(key, result);
                                    // we always return a promise
                                    return new Promise((resolve, reject) => {
                                        resolve(result);
                                    });
                                }
                            } catch (e) {
                                if (e !== null) store.set(key, e);
                            }
                        };
                        actionProvider = wrapper;

                        // we add the reset function
                        if (ActionProvider.reset !== undefined) {
                            actionProvider.reset = () => {
                                const result = ActionProvider.reset(
                                    keyStore,
                                    settings
                                );
                                if (result !== undefined) keyStore.set(result);
                            };
                        }
                    } else {
                        actionProvider = new ActionProvider(
                            store,
                            settings,
                            key
                        );
                    }
                    actions[actionKey] = actionProvider;
                }

                actionProvider = actions[actionKey];

                this.actionProviders[key + actionNameKey] = actionProvider;
                this.keyList.push(key);
            }

            if (noStore) return;

            for (const k of this.keyList) {
                this._state[k] = store.get(k);
            }

            this.mounted = false;

            this.watcherIds = {};
            for (const k of this.keyList) {
                this.watcherIds[k] = store.watch(k, this.handleUpdate);
            }
        }

        componentDidMount() {
            this.mounted = true;
            // we update the state in case it has changed, which can happen
            // when a child component performs an action in componentDidMount
            // while this parent component is not yet mounted
            if (this._state !== undefined) {
                this.setState(this._state);
                delete this._state;
            }
        }

        componentWillUnmount() {
            this.mounted = false;
            if (noStore) return;
            for (const key of this.keyList) {
                this.props.store.unwatch(key, this.watcherIds[key]);
            }
        }

        handleUpdate = (_, key, value, notifyId) => {
            // we make sure the events get passed along in the correct order, and we
            // discard obsolete events...
            if (notifyId < this.lastNotifyId) return;
            this.lastNotifyId = notifyId;
            if (key === '') {
                if (this.mounted) this.setState(value);
                else this._state = value;
            } else {
                if (this.mounted) {
                    this.setState({
                        [key]: value,
                    });
                } else this._state[key] = value;
            }
        };

        render() {
            return (
                <Component
                    {...this.props}
                    {...(this._state || this.state)}
                    {...this.actionProviders}
                    store={this.props.store}
                    _original={this.props}
                />
            );
        }
    }

    // eslint-disable-next-line react/display-name
    const WithActions = props => (
        <SettingsContext.Consumer>
            {settings => (
                <StoreContext.Consumer>
                    {store => (
                        <Actions store={store} settings={settings} {...props} />
                    )}
                </StoreContext.Consumer>
            )}
        </SettingsContext.Consumer>
    );

    WithActions.displayName = `WithActions(${displayName(Component)})`;

    return WithActions;
}

export class Store extends React.Component {
    render() {
        return (
            <StoreContext.Provider value={this.props.store}>
                {this.props.children}
            </StoreContext.Provider>
        );
    }
}
