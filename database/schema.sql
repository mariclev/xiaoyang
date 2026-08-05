create table if not exists profiles (
 id uuid primary key default gen_random_uuid(),
 email text unique not null,
 name text default '小羊半夏',
 avatar_url text,
 status text default '持续学习与更新中',
 signature text default '愿代码有温度，记录有回响。',
 updated_at timestamptz default now()
);

create table if not exists diaries (
 id uuid primary key default gen_random_uuid(),
 user_email text not null,
 title text not null,
 content text not null,
 mood text,
 diary_date date default current_date,
 private boolean default true,
 created_at timestamptz default now()
);
