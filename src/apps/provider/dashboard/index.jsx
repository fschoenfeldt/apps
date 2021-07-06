// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React, { useEffect, useState, Fragment as F } from 'react';

import Settings from './settings';
import Schedule from './schedule';

import {
    keyPairs,
    keys,
    validKeyPairs,
    providerData,
    backupData,
    publishAppointments,
    sendInvitations,
    providerSecret,
    openAppointments,
    checkInvitations,
    submitProviderData,
    verifiedProviderData,
    checkVerifiedProviderData,
} from '../actions';
import {
    withSettings,
    withActions,
    withTimer,
    withRouter,
    CenteredCard,
    CardHeader,
    Icon,
    CardContent,
    Tabs,
    Tab,
    T,
    A,
    Message,
} from 'components';
import t from './translations.yml';

const Dashboard = withRouter(
    withActions(
        withSettings(
            withTimer(
                ({
                    route: {
                        handler: {
                            props: { tab, action, secondaryAction, id },
                        },
                    },
                    route,
                    router,
                    settings,
                    openAppointments,
                    openAppointmentsAction,
                    sendInvitations,
                    sendInvitationsAction,
                    providerData,
                    providerDataAction,
                    checkInvitations,
                    checkInvitationsAction,
                    submitProviderData,
                    submitProviderDataAction,
                    verifiedProviderData,
                    verifiedProviderDataAction,
                    checkVerifiedProviderData,
                    checkVerifiedProviderDataAction,
                    timer,
                    keys,
                    backupDataAction,
                    providerSecretAction,
                    keysAction,
                    publishAppointments,
                    publishAppointmentsAction,
                    keyPairs,
                    keyPairsAction,
                    validKeyPairs,
                    validKeyPairsAction,
                }) => {
                    const [initialized, setInitialized] = useState(false);
                    const [lastUpdated, setLastUpdated] = useState('');
                    const [tv, setTv] = useState(-1);

                    useEffect(() => {
                        if (initialized) return;
                        setInitialized(true);
                        keysAction().then(ks =>
                            keyPairsAction().then(kp =>
                                validKeyPairsAction(kp.data, ks.data)
                            )
                        );
                    });

                    useEffect(() => {
                        // we do this only once per timer interval...
                        if (timer === tv) return;
                        setTv(timer);
                        setLastUpdated(new Date().toLocaleTimeString());
                        openAppointmentsAction();
                        keysAction().then(ks =>
                            keyPairsAction().then(kp => {
                                providerSecretAction().then(ps =>
                                    backupDataAction(kp.data, ps.data)
                                );
                                validKeyPairsAction(kp.data, ks.data);
                                providerDataAction().then(pd => {
                                    if (
                                        pd === undefined ||
                                        pd.data === undefined ||
                                        Object.keys(pd.data.data).length === 0
                                    ) {
                                        router.navigateToUrl('/provider/setup');
                                        return;
                                    } else if (
                                        pd.data.submittedAt === undefined ||
                                        pd.data.version !== '0.4'
                                    ) {
                                        // we try to submit the data...
                                        submitProviderDataAction(
                                            pd.data,
                                            kp.data,
                                            ks.data
                                        );
                                    } else {
                                        verifiedProviderDataAction().then(
                                            vd => {
                                                if (vd === undefined) return;
                                                if (
                                                    vd.data === null &&
                                                    pd.data.submittedAt !==
                                                        undefined &&
                                                    new Date(
                                                        pd.data.submittedAt
                                                    ) <
                                                        new Date(
                                                            new Date().getTime() -
                                                                1000 * 60 * 15
                                                        )
                                                ) {
                                                    // no verified provider data yet, we submit the data again
                                                    submitProviderDataAction(
                                                        pd.data,
                                                        kp.data,
                                                        ks.data
                                                    );
                                                }
                                            }
                                        );
                                    }

                                    // we always check for updates in the verified provider data
                                    checkVerifiedProviderDataAction(
                                        pd.data,
                                        kp.data
                                    );
                                });
                            })
                        );
                        if (
                            keyPairs === undefined ||
                            keyPairs.status !== 'loaded' ||
                            verifiedProviderData === undefined ||
                            verifiedProviderData.status !== 'loaded' ||
                            verifiedProviderData.data === null
                        )
                            return;

                        // we send invitations and then check invitation data
                        sendInvitationsAction(
                            keyPairs.data,
                            verifiedProviderData.data
                        );

                        // we send invitations and then check invitation data
                        publishAppointmentsAction(keyPairs.data).finally(() =>
                            checkInvitationsAction(keyPairs.data)
                        );
                    });

                    let content;

                    switch (tab) {
                        case 'settings':
                            content = (
                                <Settings key="settings" action={action} />
                            );
                            break;
                        case 'schedule':
                            content = (
                                <Schedule
                                    action={action}
                                    route={route}
                                    secondaryAction={secondaryAction}
                                    id={id}
                                    key="schedule"
                                    lastUpdated={lastUpdated}
                                />
                            );
                            break;
                    }

                    let invalidKeyMessage;

                    if (
                        validKeyPairs !== undefined &&
                        validKeyPairs.valid !== true
                    ) {
                        invalidKeyMessage = (
                            <Message waiting type="warning">
                                <T t={t} k="invalid-key" />
                            </Message>
                        );
                    }

                    return (
                        <CenteredCard size="fullwidth" tight>
                            <CardHeader>
                                <div
                                    style={{
                                        padding: '1rem',
                                        background: 'green',
                                        color: 'white',
                                        textAlign: 'center',
                                        marginBottom: '1rem',
                                    }}
                                >
                                    Bitte eingeloggt bleiben, Termine werden
                                    aktiv vermittelt!
                                </div>
                                <Tabs>
                                    <Tab
                                        active={tab === 'schedule'}
                                        href="/provider/schedule"
                                    >
                                        <T t={t} k="schedule.title" />
                                    </Tab>
                                    <Tab
                                        active={tab === 'settings'}
                                        href="/provider/settings"
                                    >
                                        <T t={t} k="settings.title" />
                                    </Tab>
                                    <Tab
                                        last
                                        icon={<Icon icon="sign-out-alt" />}
                                        active={tab === 'log-out'}
                                        href="/provider/settings/logout"
                                    >
                                        <T t={t} k="log-out" />
                                    </Tab>
                                </Tabs>
                            </CardHeader>
                            {invalidKeyMessage}
                            {content}
                        </CenteredCard>
                    );
                },
                10000
            )
        ),
        [
            verifiedProviderData,
            publishAppointments,
            keyPairs,
            keys,
            validKeyPairs,
            sendInvitations,
            backupData,
            providerSecret,
            providerData,
            submitProviderData,
            checkInvitations,
            openAppointments,
            checkVerifiedProviderData,
        ]
    )
);

export default Dashboard;
