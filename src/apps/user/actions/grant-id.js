// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

export async function grantID(state, keyStore, settings) {
    const backend = settings.get('backend');
    return {
        status: 'loaded',
        data: backend.local.get('user::invitation::grantID'),
    };
}

grantID.actionName = 'grantID';
