alter table audit_runs
    add column owner_user_id uuid;

alter table audit_runs
    add column claimed_at timestamp with time zone;

alter table audit_runs
    add constraint fk_audit_runs_owner_user
        foreign key (owner_user_id) references auth_users (id);

create index idx_audit_runs_owner_created_at
    on audit_runs (owner_user_id, created_at desc);

create table audit_claim_tokens (
    id uuid primary key,
    job_id varchar(64) not null,
    token_hash varchar(128) not null,
    reserved_user_id uuid,
    expires_at timestamp with time zone not null,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone not null,
    constraint fk_audit_claim_tokens_run foreign key (job_id) references audit_runs (job_id),
    constraint fk_audit_claim_tokens_reserved_user foreign key (reserved_user_id) references auth_users (id),
    constraint uk_audit_claim_tokens_hash unique (token_hash)
);

create index idx_audit_claim_tokens_reserved_user
    on audit_claim_tokens (reserved_user_id, consumed_at, expires_at, created_at desc);
