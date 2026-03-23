alter table audit_events add column source_event_id varchar(191);
alter table audit_events add column source_topic varchar(255);
alter table audit_events add column source_partition integer;
alter table audit_events add column source_offset bigint;

alter table audit_events
    add constraint uk_audit_events_source_event_id unique (source_event_id);

create index idx_audit_events_source_event_id on audit_events (source_event_id);
