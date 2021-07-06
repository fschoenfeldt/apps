// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React, { useEffect, useState, Fragment as F } from 'react';

import Settings from './settings';
import Appointments from './appointments';

import { keys, queues } from 'apps/provider/actions';
import {
    userSecret,
    backupData,
    tokenData,
    queueData,
    getAppointments,
    invitation,
    checkInvitationData,
} from 'apps/user/actions';
import {
    CenteredCard,
    CardHeader,
    CardContent,
    CardFooter,
    withRouter,
    withSettings,
    withActions,
    withTimer,
    Icon,
    Tabs,
    Tab,
    T,
    A,
    Message,
} from 'components';
import { StoreOnline } from 'apps/user/setup/store-secrets';
import t from './translations.yml';

const Dashboard = withRouter(
    withTimer(
        withActions(
            withSettings(
                ({
                    route: {
                        handler: {
                            props: { tab, action },
                        },
                    },
                    settings,
                    timer,
                    keys,
                    router,
                    userSecret,
                    userSecretAction,
                    keysAction,
                    backupDataAction,
                    invitationAction,
                    checkInvitationData,
                    checkInvitationDataAction,
                    getAppointments,
                    getAppointmentsAction,
                    queueData,
                    queueDataAction,
                    queues,
                    queuesAction,
                    tokenData,
                    tokenDataAction,
                }) => {
                    const [tv, setTv] = useState(-2);

                    useEffect(() => {
                        // we do this only once per timer interval...
                        if (timer === tv) return;
                        setTv(timer);
                        userSecretAction().then(us =>
                            keysAction().then(kd =>
                                tokenDataAction().then(td => {
                                    if (td === undefined || td.data === null)
                                        return;
                                    const { queueData: qd } = td.data;

                                    getAppointmentsAction(qd);

                                    checkInvitationDataAction(kd.data, td.data);
                                    backupDataAction(us.data);
                                    invitationAction();
                                })
                            )
                        );
                    });

                    let content;
                    let menu;

                    switch (tab) {
                        case 'settings':
                            content = <Settings action={action} />;
                            menu = (
                                <A href={'/user/appointments'}>
                                    <span className="kip-icon">
                                        <Icon icon="chevron-left" />{' '}
                                        <T t={t} k="go-back.button" />
                                    </span>
                                </A>
                            );
                            break;
                        case 'appointments':
                            content = <Appointments />;
                            menu = (
                                <A href={'/user/settings'}>
                                    <span className="kip-icon">
                                        <Icon icon="cogs" />
                                    </span>
                                </A>
                            );
                            break;
                    }

                    return (
                        <CenteredCard tight>
                            <CardHeader>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        paddingBottom: '13px',
                                    }}
                                >
                                    {menu}
                                </div>
                            </CardHeader>
                            {content}
                        </CenteredCard>
                    );
                }
            ),
            [
                tokenData,
                keys,
                checkInvitationData,
                invitation,
                queueData,
                queues,
                getAppointments,
                userSecret,
                backupData,
            ]
        ),
        10000
    )
);

export default Dashboard;

/*

*/
