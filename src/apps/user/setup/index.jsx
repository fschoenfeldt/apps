// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React, { useEffect, useRef, useState } from 'react';
import { withActions } from 'components';
import Wizard from './wizard';

import './index.scss';

const Setup = withActions(({ route }) => {
    return (
        <React.Fragment>
            <Wizard
                route={route}
                type={route.handler.props.type || 'print'}
                page={route.handler.props.page || 'hi'}
            />
        </React.Fragment>
    );
}, []);

export default Setup;
