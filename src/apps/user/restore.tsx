// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React from 'react';
import {
    withActions,
    CenteredCard,
    Button,
    RetractingLabelInput,
    Message,
    CardContent,
    CardHeader,
    CardFooter,
} from 'components';
import { restoreFromBackup } from 'apps/user/actions';
import { t, Trans } from '@lingui/macro';
import { Resolver, SubmitHandler, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatSecret } from 'helpers/string';

interface FormData {
    secret: string;
}

const resolver: Resolver<FormData> = async (values) => {
    const errors: Partial<FormData> = {};

    if (values.secret !== undefined) {
        values.secret = values.secret
            .toLowerCase()
            .replace(/[^abcdefghijkmnpqrstuvwxyz23456789]/g, '');
    }

    if (!/[abcdefghijkmnpqrstuvwxyz23456789]{16,20}/i.exec(values.secret)) {
        errors.secret = t({ id: 'load-backup.invalid-secret' });
    }

    return {
        values,
        errors,
    };
};

const RestorePage: React.FC<any> = ({
    restoreFromBackup,
    restoreFromBackupAction,
}) => {
    const navigate = useNavigate();
    const { hash } = useLocation();

    const onSubmit: SubmitHandler<FormData> = (data) => {
        restoreFromBackupAction(data.secret).then((data: any) => {
            if (data.status === 'succeeded') {
                navigate('/user/appointments');
            }
        });
    };

    const { register, handleSubmit, formState } = useForm<FormData>({
        resolver,
        mode: 'onChange',
        reValidateMode: 'onChange',
        defaultValues: {
            secret: hash.match(/#(\S*),v0\.1/i)?.[1],
        },
    });

    return (
        <CenteredCard className="kip-user-restore-from-backup">
            <CardHeader>
                <h1 className="bulma-subtitle">
                    <Trans id="load-backup.title">Anmelden</Trans>
                </h1>
            </CardHeader>

            <form
                className="kip-form"
                name="restore"
                onSubmit={handleSubmit(onSubmit)}
            >
                <CardContent>
                    {restoreFromBackup?.status === 'failed' && (
                        <Message variant="danger">
                            <Trans id="load-backup.failed">
                                Das Laden Deiner Daten ist leider
                                fehlgeschlagen. Bitte prüfe Deinen
                                Sicherheitscode.
                            </Trans>
                        </Message>
                    )}

                    <RetractingLabelInput
                        label={t({
                            id: 'load-backup.secret.label',
                            message: 'Sicherheitscode',
                        })}
                        description={t({
                            id: 'load-backup.secret.description',
                            message:
                                'Der Sicherheitscode, den Du bei der Registrierung erhalten hast.',
                        })}
                        {...register('secret', {
                            required: true,
                            setValueAs: (value) => formatSecret(value || ''),
                        })}
                    />
                </CardContent>

                <CardFooter>
                    <Button
                        variant="success"
                        type="submit"
                        disabled={!formState.isValid || formState.isSubmitting}
                    >
                        <Trans id="load-backup.load">Anmelden</Trans>
                    </Button>
                </CardFooter>
            </form>
        </CenteredCard>
    );
};

export default withActions(RestorePage, [restoreFromBackup]);
