// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React, { ReactChild } from 'react';
import PropTypes from 'prop-types';
import { ButtonIcon } from './button';
import classnames from 'classnames'
import './message.scss';

type MessageProps = {
    children: ReactChild;
    className?: string;
    waiting?: boolean;
    type: 'info' | 'success' | 'danger' | 'primary' | 'warning';
};

export const Message = ({ children, className, waiting, type }: MessageProps) => (
    <div className={classnames(className, 'bulma-message', `bulma-is-${type}`)}>
        <div className="bulma-message-body">
            {waiting && (
                <React.Fragment>
                    <ButtonIcon icon="circle-notch fa-spin" />
                    &nbsp;
                </React.Fragment>
            )}
            {children}
        </div>
    </div>
);

Message.propTypes = {
    children: PropTypes.node.isRequired,
    waiting: PropTypes.bool,
    type: PropTypes.oneOf(['info', 'success', 'danger', 'primary', 'warning'])
};
