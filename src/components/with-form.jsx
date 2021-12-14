// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React from 'react';
import PropTypes from 'prop-types';
import { withActions } from './store';
import KeyValue from 'actions/key-value';
import { withSettings } from './settings';

export function withForm(Component, Form, formName) {
    class WithForm extends React.Component {
        get actions() {
            return this.props[`${formName}Actions`];
        }

        getForm = () => {
            const { settings } = this.props;
            const data = this.actions.get().data || {};
            const error = this.actions.get().error;
            return new Form(data, settings, error);
        };

        reset = (populateData) => {
            this.actions.reset();
            if (populateData) this.actions.set({ data: populateData });
        };

        setError = (error) => {
            this.actions.update({ error: error });
        };

        set = (key, value) => {
            const data = this.actions.get().data || {};
            if (data[key] === value) return data;
            data[key] = value;
            const error = this.actions.get().error;
            // we clear the independent error for the updated field, as it has
            // been modified now...
            if (
                error !== undefined &&
                error.errors !== undefined &&
                error.errors[key] !== undefined
            ) {
                delete error.errors[key];
            }
            this.actions.update({ data: data, error: error });
            return data;
        };

        clearError = () => {
            this.actions.update({ error: undefined });
        };

        setError = (error) => {
            this.actions.update({ error: error });
        };

        render() {
            const form = this.getForm();
            const props = {
                ...this.props,
                [formName]: {
                    reset: this.reset,
                    set: this.set,
                    setError: this.setError,
                    clearError: this.clearError,
                    data: form.data,
                    error: form.error,
                    valid: form.valid,
                },
            };

            return <Component {...props} />;
        }
    }

    WithForm.propTypes = {
        settings: PropTypes.object.isRequired,
        onChange: PropTypes.func,
        onError: PropTypes.func,
    };

    return withSettings(withActions(WithForm, [KeyValue], [formName]));
}
