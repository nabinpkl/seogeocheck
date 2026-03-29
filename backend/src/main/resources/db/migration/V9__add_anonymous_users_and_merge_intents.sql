alter table auth_users
    add column account_kind varchar(32);

update auth_users
set account_kind = case
    when enabled = true and email_verified_at is not null then 'EMAIL_VERIFIED'
    else 'EMAIL_UNVERIFIED'
end
where account_kind is null;

alter table auth_users
    alter column account_kind set not null;

alter table auth_users
    alter column email_normalized drop not null;

alter table auth_users
    alter column email_original drop not null;

alter table auth_users
    alter column password_hash drop not null;

alter table auth_users
    add constraint ck_auth_users_account_kind
        check (account_kind in ('ANONYMOUS', 'EMAIL_UNVERIFIED', 'EMAIL_VERIFIED'));

create table auth_user_merge_intents (
    id uuid primary key,
    source_user_id uuid not null,
    target_user_id uuid not null,
    created_at timestamp with time zone not null,
    expires_at timestamp with time zone not null,
    consumed_at timestamp with time zone,
    constraint fk_auth_user_merge_intents_source_user
        foreign key (source_user_id) references auth_users (id) on delete cascade,
    constraint fk_auth_user_merge_intents_target_user
        foreign key (target_user_id) references auth_users (id) on delete cascade,
    constraint ck_auth_user_merge_intents_distinct_users
        check (source_user_id <> target_user_id)
);

create index idx_auth_user_merge_intents_source_user
    on auth_user_merge_intents (source_user_id, expires_at desc);

create index idx_auth_user_merge_intents_target_user
    on auth_user_merge_intents (target_user_id, expires_at desc);
