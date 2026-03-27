create table auth_password_reset_tokens (
    id uuid primary key,
    user_id uuid not null,
    token_hash varchar(128) not null,
    expires_at timestamp with time zone not null,
    used_at timestamp with time zone,
    superseded_at timestamp with time zone,
    created_at timestamp with time zone not null,
    sent_at timestamp with time zone not null,
    constraint fk_auth_password_reset_tokens_user foreign key (user_id) references auth_users (id),
    constraint uk_auth_password_reset_tokens_hash unique (token_hash)
);

create index idx_auth_password_reset_tokens_user_active
    on auth_password_reset_tokens (user_id, used_at, superseded_at, expires_at);

create index idx_auth_password_reset_tokens_user_sent_at
    on auth_password_reset_tokens (user_id, sent_at desc);
