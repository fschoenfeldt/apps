// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React, { useEffect } from 'react';
import {
    withSettings,
    withRouter,
    CenteredCard,
    CardContent,
    A,
    T,
} from 'components';
import { Trans } from '@lingui/macro';

// styles are in 'apps/provider/start.scss'

export default withRouter(
    withSettings(({ router, settings }) => {
        useEffect(() => {
            const backend = settings.get('backend');
            if (backend.local.get('user::tokenData') !== null)
                router.navigateToUrl('/user/appointments');
        });
        return (
            <CenteredCard className="kip-cm-welcome">
                <CardContent>
                    <h1 className="bulma-subtitle">
                        <Trans id="what-to-do" />
                    </h1>
                    <ul className="kip-cm-selector">
                        <li>
                            <A href="/user/setup">
                                <Trans id="setup" />
                            </A>
                        </li>
                        <li>
                            <A href="/user/restore">
                                <Trans id="restore" />
                            </A>
                        </li>
                    </ul>
                </CardContent>
            </CenteredCard>
        );
    })
);
