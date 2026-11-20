create extension if not exists vector with schema extensions;

create table documents (
  id bigint generated always as identity primary key,
  source text not null,            -- which file the chunk came from
  content text not null,           -- the chunk text
  embedding extensions.vector(1024) not null, -- voyage-4-lite = 1024 numbers
  created_at timestamptz not null default now()
);

-- fast similarity search (cosine), like the AI SDK RAG guide
create index on documents using hnsw (embedding extensions.vector_cosine_ops);

-- block the public Data API. Our server connects as postgres, so it still works.
alter table documents enable row level security;

create table handoffs (
  id bigint generated always as identity primary key,
  name text not null,
  contact text not null,      -- phone or email the guest gave
  question text not null,
  created_at timestamptz not null default now()
);
alter table handoffs enable row level security;