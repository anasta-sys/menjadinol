-- 009_expand_content_length.sql

alter table public.posts
drop constraint if exists posts_body_check;

alter table public.posts
add constraint posts_body_check
check (char_length(body) between 1 and 100000);

alter table public.learning_articles
drop constraint if exists learning_articles_body_check;

alter table public.learning_articles
add constraint learning_articles_body_check
check (char_length(body) <= 100000);