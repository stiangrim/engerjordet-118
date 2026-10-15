-- Naturlig rekkefølge for oppussing (faser → poster innen kategori)

update public.budget_items bi
set sort_order = v.ord
from (
  values
    ('Riving og avfall', 'Riving', 1),
    ('Riving og avfall', 'Container', 2),
    ('VVS', 'Rørlegger – materialer', 10),
    ('VVS', 'Rørlegger – utførelse', 11),
    ('Elektrisk', 'Elektrisk – arbeid', 20),
    ('Elektrisk', 'Elektrisk – materialer', 21),
    ('Elektrisk', 'El-skap m.m.', 22),
    ('Vegger', 'Gips- og lettvegger', 30),
    ('Vegger', 'Gipsvegger', 30),
    ('Vegger', 'Lettvegger m.m.', 31),
    ('Vinduer/dører', 'Vinduer', 40),
    ('Vinduer/dører', 'Vindusmontasje', 41),
    ('Vinduer/dører', 'Balkongdør', 42),
    ('Bad', 'Membran', 50),
    ('Bad', 'Støp/varmekabler', 51),
    ('Bad', 'Flis', 52),
    ('Bad', 'Flislegging', 53),
    ('Bad', 'Baderomsinnredning', 54),
    ('Kjøkken', 'Kjøkken', 60),
    ('Trapp', 'Trapp', 70),
    ('Gulv', 'Parkett', 80),
    ('Dører/listverk', 'Listverk/dører', 90),
    ('Dører/listverk', 'Fotlister', 91),
    ('Maling', 'Maling', 100),
    ('Inngangsparti', 'Materialer', 110),
    ('Inngangsparti', 'Ombygging', 111),
    ('Inngangsparti', 'Dør', 112),
    ('Uforutsett', 'Uforutsett timearbeid', 999)
) as v(category, post, ord)
where bi.category = v.category and bi.post = v.post;
