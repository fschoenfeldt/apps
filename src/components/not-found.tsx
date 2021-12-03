// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React from 'react';
import { CenteredCard } from './card';
import { Message } from './message';

import { Trans } from '@lingui/macro';

export const NotFound = () => {
    return (
        <CenteredCard>
            <Message variant="warning">
                <Trans id="pageDoesNotExist">pageDoesNotExist MISSING</Trans>
            </Message>
        </CenteredCard>
    );
};
