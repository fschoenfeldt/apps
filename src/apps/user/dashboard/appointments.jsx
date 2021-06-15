// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React, { useEffect, useState, Fragment as F } from 'react';

import Settings from './settings';
import { keys } from 'apps/provider/actions';
import { formatDuration, formatDate, formatTime } from 'helpers/time';
import classNames from 'helpers/classnames';
import {
    tokenData,
    grantID,
    slotInfos,
    userSecret,
    invitation,
    confirmOffers,
    cancelInvitation,
    confirmDeletion,
    acceptedInvitation,
} from 'apps/user/actions';
import {
    withSettings,
    withActions,
    ButtonIcon,
    Button,
    Card,
    Modal,
    CardContent,
    CardHeader,
    CardFooter,
    WithLoader,
    T,
    A,
    Message,
} from 'components';
import t from './translations.yml';
import './appointments.scss';

const ProviderDetails = ({ data }) => {
    return (
        <div className="kip-provider-details">
            <ul>
                <li>{data.json.name}</li>
                <li>{data.json.street}</li>
                <li>{data.json.zipCode}</li>
                <li>{data.json.city}</li>
                {data.json.accessible && (
                    <li>
                        <T t={t} k="provider-details.accessible" />
                    </li>
                )}
            </ul>
            {data.json.description && <Message type="info">{data.json.description}</Message>}
        </div>
    );
};

const OfferDetails = withSettings(({ settings, offer }) => {
    // we disable this for now (until the texts are ready)
    return <div />;
    const lang = settings.get('lang');
    const notices = [];
    const properties = settings.get('appointmentProperties');
    for (const [category, values] of Object.entries(properties)) {
        for (const [k, v] of Object.entries(values.values)) {
            if (offer[k] === true)
                notices.push(
                    <li key={k} className={`kip-tag kip-is-${k}`}>
                        {v.notice[lang]}
                    </li>
                );
        }
    }

    return <div className="kip-offer-details">{notices}</div>;
});

const AcceptedInvitation = withActions(
    ({
        tokenData,
        acceptedInvitation,
        acceptedInvitationAction,
        confirmDeletionAction,
        cancelInvitation,
        invitationAction,
        cancelInvitationAction,
        grantIDAction,
        slotInfosAction,
        offers,
        userSecret,
    }) => {
        const [showDelete, setShowDelete] = useState(false);

        const doDelete = () => {
            setShowDelete(false);
            cancelInvitationAction(
                acceptedInvitation.data,
                tokenData.data
            ).then(() => {
                // we reload the appointments
                grantIDAction();
                slotInfosAction();
                invitationAction();
                acceptedInvitationAction();
            });
        };

        const {
            offer,
            invitation: invitationData,
            slotData,
        } = acceptedInvitation.data;
        const currentOffer = offers.find(of => of.id == offer.id);
        let currentSlotData;
        if (currentOffer !== undefined)
            currentSlotData = currentOffer.slotData.find(
                sl => sl.id === slotData.id
            );
        let notice;
        if (currentOffer === undefined || currentSlotData === undefined)
            return (
                <F>
                    <Message type="danger">
                        <T t={t} k="invitation-accepted.deleted" />
                    </Message>
                    <CardFooter>
                        <Button
                            type="warning"
                            onClick={() =>
                                confirmDeletionAction().then(
                                    acceptedInvitationAction
                                )
                            }
                        >
                            <T t={t} k="invitation-accepted.confirm-deletion" />
                        </Button>
                    </CardFooter>
                </F>
            );
        else {
            let changed = false;
            for (const [k, v] of Object.entries(currentOffer)) {
                if (
                    k === 'open' ||
                    k === 'slotData' ||
                    k === 'grants' ||
                    k === 'slots'
                )
                    continue;
                if (offer[k] !== v) {
                    changed = true;
                    break;
                }
            }
            if (changed)
                notice = (
                    <F>
                        <Message type="danger">
                            <T t={t} k="invitation-accepted.changed" />
                        </Message>
                    </F>
                );
        }
        const d = new Date(currentOffer.timestamp);

        let modal;

        if (showDelete)
            return (
                <Modal
                    onSave={doDelete}
                    onClose={() => setShowDelete(false)}
                    onCancel={() => setShowDelete(false)}
                    saveType="danger"
                    save={<T t={t} k="invitation-accepted.delete.confirm" />}
                    cancel={<T t={t} k="invitation-accepted.delete.cancel" />}
                    title={<T t={t} k="invitation-accepted.delete.title" />}
                    className="kip-appointment-overview"
                >
                    <p>
                        <T t={t} k="invitation-accepted.delete.notice" />
                    </p>
                </Modal>
            );

        return (
            <F>
                <CardContent>
                    {notice}
                    <div className="kip-accepted-invitation">
                        <h2>
                            <T t={t} k="invitation-accepted.title" />
                        </h2>
                        <ProviderDetails data={invitationData.provider} />
                        <OfferDetails offer={currentOffer} />
                        <p className="kip-appointment-date">
                            {d.toLocaleDateString()} · <u>{d.toLocaleTimeString()}</u>
                        </p>
                        <p className="kip-booking-code">
                            <span>
                                <T t={t} k={'invitation-accepted.booking-code'} />
                            </span>
                            {userSecret.data.slice(0, 4)}
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="warning" onClick={() => setShowDelete(true)}>
                        <T t={t} k="cancel-appointment" />
                    </Button>
                </CardFooter>
            </F>
        );
    },
    [
        userSecret,
        confirmDeletion,
        acceptedInvitation,
        cancelInvitation,
        invitation,
        grantID,
        slotInfos,
        tokenData,
    ]
);

const NoInvitations = ({ tokenData, oldGrant }) => {
    let createdAt;

    if (tokenData.createdAt !== undefined)
        createdAt = new Date(tokenData.createdAt);

    let content;

    // in the first 10 minutes since the creation of the token we show a 'please wait'
    // message, as it can take some time for appointments to show up...
    if (
        createdAt !== undefined &&
        new Date(createdAt.getTime() + 1000 * 60 * 10) > new Date()
    ) {
        content = (
            <F>
                <Message type="success">
                    <T t={t} k="no-invitations.please-wait" />
                </Message>
            </F>
        );
    } else {
        content = (
            <F>
                {(oldGrant && (
                    <Message type="warning">
                        <T t={t} k="no-invitations.old-grant-notice" />
                    </Message>
                )) || (
                    <Message type="warning">
                        <T t={t} k="no-invitations.notice" />
                    </Message>
                )}
            </F>
        );
    }
    return (
        <F>
            <CardContent>
                <div className="kip-no-invitations">{content}</div>
            </CardContent>
            <Message type="info">
                <ButtonIcon icon="circle-notch fa-spin" /> &nbsp;
                <T t={t} k="no-invitations.update-notice" />
            </Message>
        </F>
    );
};

async function toggleOffers(state, keyStore, settings, offer, offers) {
    if (offer === null) return { data: [] };
    if (state.data.find(i => i === offer.id) !== undefined) {
        state.data = state.data.filter(i => i !== offer.id);
    } else {
        state.data.push(offer.id);
    }
    // we remove non-existing offers
    state.data = state.data.filter(i =>
        offers.map(offer => offer.id).includes(i)
    );
    return { data: state.data };
}

toggleOffers.init = function () {
    return { data: [] };
};

toggleOffers.actionName = 'toggleOffers';

const PropertyTags = ({ appointment }) => {
    const props = Object.entries(appointment)
        .filter(([k, v]) => v === true)
        .map(([k, v]) => <PropertyTag key={k} property={k} />)
        .filter((p) => p !== undefined);
    return <F>{props}</F>;
};

const PropertyTag = withSettings(({ settings, property }) => {
    const lang = settings.get('lang');
    const properties = settings.get('appointmentProperties');
    for (const [category, values] of Object.entries(properties)) {
        const prop = values.values[property];
        if (prop !== undefined) {
            return (
                <span key={property} className={`kip-tag kip-is-${property}`}>
                    {prop[lang]}
                </span>
            );
        }
    }
});
const InvitationDetails = withSettings(
    withActions(
        ({
            data,
            tokenData,
            settings,
            userSecret,
            toggleOffers,
            grantID,
            grantIDAction,
            slotInfos,
            slotInfosAction,
            toggleOffersAction,
            acceptedInvitation,
            acceptedInvitationAction,
            confirmOffers,
            confirmOffersAction,
        }) => {
            const [confirming, setConfirming] = useState(false);
            const [initialized, setInitialized] = useState(false);

            useEffect(() => {
                if (initialized) return;
                setInitialized(true);
                toggleOffersAction(null);
                slotInfosAction();
                grantIDAction();
            });

            const toggle = offer => {
                toggleOffersAction(offer, data.offers);
            };

            const doConfirmOffers = () => {
                const selectedOffers = [];
                // we add the selected offers in the order the user chose
                for (const offerID of toggleOffers.data) {
                    const offer = data.offers.find(
                        offer => offer.id === offerID
                    );
                    selectedOffers.push(offer);
                }
                setConfirming(true);
                const p = confirmOffersAction(selectedOffers, data, tokenData.data);
                p.then(() => {
                    acceptedInvitationAction();
                });
                p.finally(() => {
                    setConfirming(false);
                    toggleOffersAction(null);
                    slotInfosAction();
                });
            };

            if (data !== null && acceptedInvitation.data !== null) {
                return <AcceptedInvitation offers={data.offers} />;
            }

            let content;

            let expiresAt;
            let noOpenSlots = false;
            if (data !== null) {
                // we get the latest expiration time for all grants
                data.offers.forEach(offer =>
                    offer.grants.forEach(grant => {
                        const grantData = JSON.parse(grant.data);
                        const grantExpiresAt = new Date(grantData.expiresAt);
                        if (
                            expiresAt === undefined ||
                            grantExpiresAt > expiresAt
                        )
                            expiresAt = grantExpiresAt;
                    })
                );

                noOpenSlots = !data.offers
                    .map(offer => offer.slotData)
                    .flat()
                    .some(sl => {
                        if (sl.open && !sl.canceled) {
                            if (
                                slotInfos !== undefined &&
                                slotInfos.data !== null
                            ) {
                                const slotInfo = slotInfos.data[sl.id];
                                if (slotInfo !== undefined) {
                                    if (slotInfo.status === 'taken') {
                                        return false;
                                    }
                                }
                            }
                            return true;
                        }
                        return false;
                    });
            } else noOpenSlots = true;

            let oldGrant = true;
            let oldGrantID;

            if (grantID !== undefined && grantID.data !== null)
                oldGrantID = grantID.data;

            if (oldGrantID !== undefined) {
                if (!noOpenSlots) {
                    const grant = data.offers[0].grants[0];
                    try {
                        const grantData = JSON.parse(grant.data);
                        if (grantData.grantID !== oldGrantID) oldGrant = false;
                    } catch (e) {
                        console.error(e);
                    }
                }
            } else {
                oldGrant = false;
            }

            if (
                data === null ||
                data.offers === null ||
                noOpenSlots ||
                oldGrant
            )
                return (
                    <NoInvitations
                        tokenData={tokenData.data}
                        noOpenSlots={noOpenSlots}
                        oldGrant={oldGrant}
                        data={tokenData}
                    />
                );

            const properties = settings.get('appointmentProperties');

            // to do: use something better than the index i for the key?
            const offers = data.offers
                .filter(offer => offer.slotData.some(sl => sl.open))
                .filter(a => new Date(a.timestamp) > new Date())
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .map((offer, i) => {
                    const openSlots = offer.slotData.filter(sl => {
                        const grant = offer.grants.find(
                            grant => JSON.parse(grant.data).objectID === sl.id
                        );
                        // grant is already expired for this slot
                        if (
                            grant !== undefined &&
                            new Date(JSON.parse(grant.data).expiresAt) <
                                new Date()
                        ) {
                            return false;
                        }
                        if (
                            slotInfos !== undefined &&
                            slotInfos.data !== null
                        ) {
                            const sd = slotInfos.data[sl.id];
                            if (sd !== undefined && sd.status === 'taken')
                                return false;
                        }
                        return true;
                    });

                    const d = new Date(offer.timestamp);
                    const selected = toggleOffers.data.includes(offer.id);
                    let pref;
                    if (selected)
                        pref = toggleOffers.data.indexOf(offer.id) + 1;
                    return (
                        <tr
                            key={offer.id}
                            className={classNames(`kip-pref-${pref}`, {
                                'kip-selected': selected,
                                'kip-failed': openSlots.length === 0,
                            })}
                            onClick={() => toggle(offer)}
                        >
                            <td>{selected ? pref : '-'}</td>
                            <td>
                                {d.toLocaleString(undefined, {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </td>
                            <td>{formatDuration(offer.duration, settings, t)}</td>
                            <td>
                                <PropertyTags appointment={offer} />
                            </td>
                        </tr>
                    );
                });

            let offerDetails;

            if (offers.length === 0)
                offerDetails = (
                    <Message type="warning">
                        <T t={t} k="no-offers-anymore" />
                    </Message>
                );
            else
                offerDetails = (
                    <table className="bulma-table bulma-is-striped bulma-is-fullwidth">
                        <thead>
                            <tr>
                                <th>
                                    <T t={t} k="appointment-preference" />
                                </th>
                                <th>
                                    <T t={t} k="appointment-date" />
                                </th>
                                <th>
                                    <T t={t} k="appointment-duration" />
                                </th>
                                <th>
                                    <T t={t} k="appointment-vaccine" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>{offers}</tbody>
                    </table>
                );

            let expiresAtNotice;

            if (expiresAt !== undefined) {
                const duration = expiresAt - new Date();

                if (expiresAt < new Date()) {
                    offerDetails = undefined;
                    expiresAtNotice = (
                        <Message type="danger" waiting>
                            <T t={t} k="offer-expired" />
                        </Message>
                    );
                } else {
                    expiresAtNotice = (
                        <Message type="info" waiting>
                            <T
                                t={t}
                                k="offer-expires-at"
                                time={expiresAt.toLocaleTimeString()}
                                date={expiresAt.toLocaleDateString()}
                                duration={formatDuration(
                                    Math.floor(duration / 1000 / 60),
                                    settings,
                                    t
                                )}
                            />
                        </Message>
                    );
                }
            }

            return (
                <F>
                    <CardContent>
                        <div className="kip-invitation-details">
                            <h2>
                                <T t={t} k="invitation-received.title" />
                            </h2>
                            <ProviderDetails data={data.provider} />
                            <p>
                                <T t={t} k="appointments-notice" />
                            </p>
                            {expiresAtNotice}
                            {offerDetails}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            waiting={confirming}
                            onClick={doConfirmOffers}
                            disabled={confirming || Object.keys(toggleOffers.data).length === 0}
                            type="success"
                        >
                            <T t={t} k="confirm-appointment" />
                        </Button>
                    </CardFooter>
                </F>
            );
        },
        [
            toggleOffers,
            confirmOffers,
            acceptedInvitation,
            userSecret,
            slotInfos,
            grantID,
        ]
    )
);

const Appointments = withActions(
    ({ settings, invitation, tokenData }) => {
        let content;
        const render = () => {
            return <InvitationDetails tokenData={tokenData} data={invitation.data} />;
        };
        return <WithLoader resources={[tokenData, invitation]} renderLoaded={render} />;
    },
    [tokenData, invitation]
);

export default Appointments;
