create table auth_users (
    id uuid primary key,
    email_normalized varchar(320) not null,
    email_original varchar(320) not null,
    password_hash text not null,
    enabled boolean not null default false,
    email_verified_at timestamp with time zone,
    failed_login_count integer not null default 0,
    failed_login_window_started_at timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint uk_auth_users_email_normalized unique (email_normalized)
);

create table auth_email_verification_tokens (
    id uuid primary key,
    user_id uuid not null,
    token_hash varchar(128) not null,
    expires_at timestamp with time zone not null,
    used_at timestamp with time zone,
    superseded_at timestamp with time zone,
    created_at timestamp with time zone not null,
    sent_at timestamp with time zone not null,
    constraint fk_auth_email_verification_tokens_user foreign key (user_id) references auth_users (id),
    constraint uk_auth_email_verification_tokens_hash unique (token_hash)
);

create index idx_auth_email_verification_tokens_user_active
    on auth_email_verification_tokens (user_id, used_at, superseded_at, expires_at);

create index idx_auth_email_verification_tokens_user_sent_at
    on auth_email_verification_tokens (user_id, sent_at desc);
