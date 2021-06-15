// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import {
    sign,
    ecdhEncrypt,
    ecdhDecrypt,
    randomBytes,
    generateECDHKeyPair,
} from 'helpers/crypto';

import { shuffle } from 'helpers/lists';

function getQueuePrivateKey(queueID, verifiedProviderData) {
    for (const queueKeys of verifiedProviderData.queuePrivateKeys) {
        if (queueKeys.id === queueID) return JSON.parse(queueKeys.privateKey);
    }
    return null;
}

// regularly checks open appointment slots
export async function sendInvitations(
    state,
    keyStore,
    settings,
    keyPairs,
    verifiedProviderData
) {
    const backend = settings.get('backend');
    // we lock the local backend to make sure we don't have any data races

    try {
        // we lock the local backend to make sure we don't have any data races
        await backend.local.lock();
    } catch (e) {
        throw null; // we throw a null exception (which won't affect the store state)
    }

    // we process at most N tokens during one invocation of this function
    const N = 500;

    try {
        let openAppointments = backend.local.get(
            'provider::appointments::open',
            []
        );

        if (openAppointments.length === 0)
            // we don't have any new appointments to give out
            return {
                status: 'succeeded',
            };

        // only offer appointments that are in the future
        openAppointments = openAppointments.filter(oa => {
            const timestamp = new Date(oa.timestamp);
            const inOneHour = new Date(new Date().getTime() + 1000 * 60 * 60);
            return timestamp > new Date();
        });

        // checks if the token is expired - a 15 minute grace period is given
        const isExpired = token =>
            token.expiresAt !== undefined &&
            new Date(token.expiresAt) <=
                new Date(new Date().getTime() - 1000 * 60 * 15);

        let expiredTokens = backend.local.get('provider::tokens::expired', []);
        let openTokens = backend.local.get('provider::tokens::open', []);
        // we announce expired tokens to the backend
        let newlyExpiredTokens = openTokens.filter(token => isExpired(token));

        // we filter out any expired tokens...
        openTokens = openTokens.filter(token => !isExpired(token));

        // we send the signed, encrypted data to the backend
        if (newlyExpiredTokens.length > 0) {
            backend.local.set('provider::tokens::expired', [
                ...expiredTokens,
                ...newlyExpiredTokens,
            ]);
            try {
                await backend.appointments.returnTokens(
                    { tokens: expiredTokens.map(token => token.token) },
                    keyPairs.signing
                );
            } catch (e) {
                console.error(e);
            }
        }

        let openSlots = 0;
        openAppointments.forEach(ap => {
            openSlots += ap.slotData.filter(sl => sl.open).length;
        });
        try {
            // how many more users we invite than we have slots
            const overbookingFactor = 20;
            console.log(`Got ${openSlots} open slots and ${openTokens.length} open tokens, overbooking factor is ${overbookingFactor}...`)
            const n = Math.floor(
                Math.max(0, openSlots * overbookingFactor - openTokens.length)
            );
            // we don't have enough tokens for our open appointments, we generate more
            if (n > 0 && openTokens.length < 3000) {
                console.log(`Trying to get ${n} new tokens...`)
                // to do: get appointments by type
                const newTokens = await backend.appointments.getQueueTokens(
                    { capacities: [{ n: n, properties: {} }] },
                    keyPairs.signing
                );
                if (newTokens === null)
                    return {
                        status: 'failed',
                    };
                const validTokens = [];
                for (const tokenList of newTokens) {
                    console.log(`New tokens received: ${tokenList.length}`)
                    for (const token of tokenList) {
                        const privateKey = getQueuePrivateKey(
                            token.queue,
                            verifiedProviderData
                        );
                        try {
                            token.data = JSON.parse(
                                await ecdhDecrypt(
                                    token.encryptedData,
                                    privateKey
                                )
                            );
                            if (token.data === null) continue;
                        } catch (e) {
                            console.error(e);
                            continue;
                        }
                        token.keyPair = await generateECDHKeyPair();
                        token.grantID = randomBytes(32);
                        token.slotIDs = [];
                        token.createdAt = new Date().toISOString();
                        validTokens.push(token);
                    }
                    openTokens = [...openTokens, ...validTokens];
                }
                // we update the list of open tokens
                backend.local.set('provider::tokens::open', openTokens);
            }

            const selectedAppointments = openAppointments.filter(
                oa =>
                    new Date(oa.timestamp) > new Date() &&
                    oa.slotData.filter(sl => sl.open || true).length > 0
            );
            const appointmentsById = {};
            const appointmentsBySlotId = {};
            const slotsById = {};

            for (const oa of selectedAppointments) {
                appointmentsById[oa.id] = oa;
                for (const slot of oa.slotData) {
                    appointmentsBySlotId[slot.id] = oa;
                    slotsById[slot.id] = slot;
                }
            }

            const currentIndex = backend.local.get(
                'provider::appointments::send::index',
                0
            );
            let newIndex = currentIndex + N;
            if (newIndex >= openTokens.length) newIndex = 0; // we start from the beginning
            backend.local.set('provider::appointments::send::index', newIndex);

            let dataToSubmit = [];
            // we make sure all token holders can initialize all appointment data IDs
            for (const [i, token] of openTokens
                .slice(currentIndex, currentIndex + N)
                .entries()) {
                try {
                    let hasBookedSlot = false;

                    if (token.grantID === undefined)
                        token.grantID = randomBytes(32);
                    if (token.slotIDs === undefined) {
                        token.slotIDs = [];
                        // we always add the booked slot (we can remove this for the next version, just for backwards-compatibility)
                        for (const slot of Object.values(slotsById)) {
                            if (
                                slot.token !== undefined &&
                                slot.token.token === token.token
                            ) {
                                token.slotIDs.push(slot.id);
                            }
                        }
                    }

                    for (const slot of Object.values(slotsById)) {
                        if (
                            slot.token !== undefined &&
                            slot.token.token === token.token
                        ) {
                            hasBookedSlot = true;
                            break;
                        }
                    }
                    const expiresInHours = 8;
                    // to do: remove this once all tokens have proper expiration times
                    if (
                        token.expiresAt === undefined ||
                        (!hasBookedSlot &&
                            new Date(token.expiresAt) >
                                new Date(
                                    new Date().getTime() +
                                        1000 * 60 * 60 * expiresInHours
                                ))
                    ) {
                        // users have a given time to respond
                        token.expiresAt = new Date(
                            new Date().getTime() +
                                1000 * 60 * 60 * expiresInHours
                        ).toISOString();
                    }

                    token.slotIDs = token.slotIDs.filter(id => {
                        const slot = slotsById[id];
                        // we remove slots that have been deleted e.g. because
                        // the appointment has been deleted
                        if (slot === undefined) return false;
                        // we remove slots taken by other users as the user
                        // won't be able to book them anymore...
                        if (!slot.open && !slot.token.token === token.token)
                            return false;
                        return true;
                    });

                    addSlots: while (token.slotIDs.length < 12) {
                        let addedSlots = 0;
                        // we shuffle the open appointments to distribute them
                        // evenly over all tokens
                        shuffle(selectedAppointments);
                        for (const oa of selectedAppointments) {
                            const openSlots = oa.slotData.filter(sl => sl.open);
                            // we shuffle the open slots to distribute them
                            // evenly over all tokens
                            shuffle(openSlots);
                            const existingSlots = token.slotIDs.filter(
                                sl =>
                                    oa.slotData.find(
                                        osl => osl.id === sl.id
                                    ) !== undefined
                            ).length;
                            if (existingSlots >= 3) continue; // the user already has 3 slots for this appointment, that's all we give out...
                            // we add three slots per appointment offer
                            for (
                                let i = 0;
                                i < Math.min(3, openSlots.length);
                                i++
                            ) {
                                // we check if the slot is already associated
                                // with this token
                                if (
                                    !token.slotIDs.find(
                                        id => id === openSlots[i].id
                                    )
                                ) {
                                    addedSlots++;
                                    token.slotIDs.push(openSlots[i].id);
                                }
                                if (token.slotIDs.length >= 12) break addSlots;
                            }
                        }
                        // seems there are no more slots left, we break out
                        // of the loop
                        if (addedSlots === 0) break;
                    }

                    if (token.createdAt === undefined)
                        token.createdAt = new Date().toISOString();

                    const slots = [];
                    token.slotIDs.forEach(id => {
                        const slot = slotsById[id];
                        if (slot !== undefined) slots.push(slot);
                    });

                    let grantsData = await Promise.all(
                        slots.map(async slot => {
                            let expiresAt = new Date(token.expiresAt);
                            const oa = appointmentsBySlotId[slot.id];
                            // cancellation & booking max 15 minutes before appointment
                            const maxExpiresAt = new Date(
                                new Date(oa.timestamp).getTime() -
                                    1000 * 60 * 15
                            );
                            if (expiresAt > maxExpiresAt)
                                expiresAt = maxExpiresAt;
                            return await sign(
                                keyPairs.signing.privateKey,
                                JSON.stringify({
                                    objectID: slot.id,
                                    grantID: token.grantID,
                                    singleUse: true,
                                    expiresAt: expiresAt.toISOString(),
                                    permissions: [
                                        {
                                            rights: ['read', 'write', 'delete'],
                                            keys: [keyPairs.signing.publicKey],
                                        },
                                        {
                                            rights: ['write', 'read', 'delete'],
                                            keys: [token.data.publicKey],
                                        },
                                    ],
                                }),
                                keyPairs.signing.publicKey
                            );
                        })
                    );

                    const appointments = {};

                    slots.forEach((slot, i) => {
                        const oa = appointmentsBySlotId[slot.id];
                        if (appointments[oa.id] === undefined)
                            appointments[oa.id] = {
                                ...oa,
                                slotData: [],
                                grants: [],
                            };

                        const appointment = appointments[oa.id];

                        appointment.slotData.push(slot);
                        appointment.grants.push(grantsData[i]);
                    });

                    const userData = {
                        provider: verifiedProviderData.signedData,
                        offers: Array.from(Object.values(appointments)),
                    };

                    let tokenPublicKey;

                    switch (token.data.version) {
                        case '0.1':
                            tokenPublicKey = token.encryptedData.publicKey;
                            break;
                        case '0.2':
                            tokenPublicKey = token.data.encryptionPublicKey;
                            break;
                    }

                    // we first encrypt the data
                    const encryptedUserData = await ecdhEncrypt(
                        JSON.stringify(userData),
                        token.keyPair,
                        tokenPublicKey
                    );
                    // we sign the data with our private key
                    const signedEncryptedUserData = await sign(
                        keyPairs.signing.privateKey,
                        JSON.stringify(encryptedUserData),
                        keyPairs.signing.publicKey
                    );
                    const submitData = {
                        id: token.data.id,
                        data: signedEncryptedUserData,
                        permissions: [
                            {
                                rights: ['read'],
                                keys: [token.data.publicKey],
                            },
                            {
                                rights: ['read', 'write', 'delete'],
                                keys: [keyPairs.signing.publicKey],
                            },
                        ],
                    };
                    dataToSubmit.push(submitData);
                } catch (e) {
                    console.error(e);
                    continue;
                }

                if (dataToSubmit.length > 100) {
                    try {
                        // we send the signed, encrypted data to the backend
                        await backend.appointments.bulkStoreData(
                            { dataList: dataToSubmit },
                            keyPairs.signing
                        );
                    } catch (e) {
                        console.error(e);
                        continue;
                    } finally {
                        dataToSubmit = [];
                    }
                }
            }

            if (dataToSubmit.length > 0) {
                try {
                    // we send the signed, encrypted data to the backend
                    await backend.appointments.bulkStoreData(
                        { dataList: dataToSubmit },
                        keyPairs.signing
                    );
                } catch (e) {
                    console.error(e);
                } finally {
                    dataToSubmit = [];
                }
            }

            backend.local.set('provider::tokens::open', openTokens);

            return { status: 'succeeded' };
        } catch (e) {
            console.error(e);
            return { status: 'failed', error: e };
        }
    } catch (e) {
        console.error(e);
    } finally {
        backend.local.unlock();
    }
}

sendInvitations.actionName = 'sendInvitations';
