-- Rooted: creates the tables and loads the demo family.
-- Paste this whole file into the Turso dashboard SQL console and run it.

CREATE TABLE IF NOT EXISTS invites (
     id TEXT PRIMARY KEY,
     token TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL,
     note TEXT,
     status TEXT NOT NULL DEFAULT 'pending',
     created_at INTEGER NOT NULL,
     submitted_at INTEGER
   );

CREATE TABLE IF NOT EXISTS parent_edges (
     id TEXT PRIMARY KEY,
     parent_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
     child_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
     adoption TEXT,
     created_at INTEGER NOT NULL
   );

CREATE TABLE IF NOT EXISTS partnerships (
     id TEXT PRIMARY KEY,
     a_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
     b_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
     status TEXT,
     created_at INTEGER NOT NULL
   );

CREATE TABLE IF NOT EXISTS people (
     id TEXT PRIMARY KEY,
     first_name TEXT NOT NULL,
     last_name TEXT,
     maiden_name TEXT,
     gender TEXT,
     birth_date TEXT,
     birth_place TEXT,
     death_date TEXT,
     death_place TEXT,
     notes TEXT,
     is_demo INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );

CREATE TABLE IF NOT EXISTS submissions (
     id TEXT PRIMARY KEY,
     invite_id TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
     status TEXT NOT NULL DEFAULT 'submitted',
     items_json TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     decided_at INTEGER
   );

-- people
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('01330cd6-ba5f-4139-8fc0-38c4af003bc8', 'Johannes', 'Mokoena', NULL, 'male', '1932', 'Bethlehem', '2016', NULL, 'Railway worker who moved the family to Johannesburg in 1954.', 1, 1791274401468, 1791274401468);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('53cd6ff2-d235-4863-a22a-f3a6aff7c91e', 'Ruth', 'Mokoena', 'Khumalo', 'female', '1936', 'Kroonstad', '2018', 'Johannesburg', 'Taught primary school for 40 years; famous for her melktert.', 1, 1791274401469, 1791274401469);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('8a61444f-6dc4-4f22-b862-ab0d53933c80', 'Thabo', 'Mokoena', NULL, 'male', '1961', 'Johannesburg', NULL, NULL, 'Eldest son; runs a hardware store in Roodepoort.', 1, 1791274401470, 1791274401470);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('9669501b-f4c8-4646-83d8-e1bcf9c56c09', 'Aisha', 'Mokoena', 'Patel', 'female', '1963', 'Durban', NULL, NULL, 'Pharmacist; met Thabo at Wits.', 1, 1791274401471, 1791274401471);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('603f72c0-185a-42c1-a5fa-af3971a854ae', 'Lerato', 'van Wyk', 'Mokoena', 'female', '1964', 'Johannesburg', NULL, NULL, NULL, 1, 1791274401472, 1791274401472);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('9d8469b4-bca9-46c0-89a2-41e92ff6e848', 'Michael', 'van Wyk', NULL, 'male', '1963', 'Cape Town', NULL, NULL, NULL, 1, 1791274401473, 1791274401473);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('148606c4-8d01-4d3a-af5a-c7aab8f9228e', 'Dineo', 'Mokoena', NULL, 'female', '1970', 'Johannesburg', NULL, NULL, 'Emigrated to Perth in 2009.', 1, 1791274401474, 1791274401474);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('4deba07a-9094-43ca-ad98-6a3c43216edc', 'Kabelo', 'Naidoo', NULL, 'male', '1972', NULL, NULL, NULL, 'Architect; partners with Dineo.', 1, 1791274401475, 1791274401475);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('4e382067-fa66-48d5-a7d2-3719636365de', 'Zanele', 'Mokoena', NULL, 'female', '1992', 'Johannesburg', NULL, NULL, NULL, 1, 1791274401476, 1791274401476);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('f01a9b98-c1c8-44f1-be5b-771d8f528b2d', 'Sipho', 'Mokoena', NULL, 'male', '1995', 'Johannesburg', NULL, NULL, 'Studying medicine at Wits.', 1, 1791274401477, 1791274401477);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('8c4e3275-2c26-425a-b96c-da00ad0a8ea6', 'Emma', 'van Wyk', NULL, 'female', '1994', NULL, NULL, NULL, NULL, 1, 1791274401478, 1791274401478);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('fa42f43e-27cd-45c5-a2e6-a25c80b26275', 'Josh', 'van Wyk', NULL, 'male', '1998', 'Johannesburg', NULL, NULL, NULL, 1, 1791274401479, 1791274401479);
INSERT INTO people (id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, is_demo, created_at, updated_at) VALUES ('b1f8bbd8-d646-424b-b937-e2d99a13f71b', 'Thembinkosi', 'Naidoo', NULL, 'male', '2005', NULL, NULL, NULL, 'Adopted by Dineo and Kabelo as a baby.', 1, 1791274401480, 1791274401480);

-- partnerships
INSERT INTO partnerships (id, a_id, b_id, status, created_at) VALUES ('191ef4be-ae1a-4c98-b49f-e46bdd934017', '01330cd6-ba5f-4139-8fc0-38c4af003bc8', '53cd6ff2-d235-4863-a22a-f3a6aff7c91e', 'married', 1791274411468);
INSERT INTO partnerships (id, a_id, b_id, status, created_at) VALUES ('6a00e50a-e9b8-4f18-a3e6-0c77d1892daa', '8a61444f-6dc4-4f22-b862-ab0d53933c80', '9669501b-f4c8-4646-83d8-e1bcf9c56c09', 'married', 1791274411469);
INSERT INTO partnerships (id, a_id, b_id, status, created_at) VALUES ('0d9c7e0b-a101-48de-b336-7972a96842e9', '603f72c0-185a-42c1-a5fa-af3971a854ae', '9d8469b4-bca9-46c0-89a2-41e92ff6e848', 'married', 1791274411470);
INSERT INTO partnerships (id, a_id, b_id, status, created_at) VALUES ('59d993d8-de74-4ccb-b23a-293158760935', '148606c4-8d01-4d3a-af5a-c7aab8f9228e', '4deba07a-9094-43ca-ad98-6a3c43216edc', 'partners', 1791274411471);

-- parent_edges
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('06d85a90-6ef7-4853-a5db-934557233705', '01330cd6-ba5f-4139-8fc0-38c4af003bc8', '8a61444f-6dc4-4f22-b862-ab0d53933c80', NULL, 1791274421468);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('31bb3c38-6371-4153-ab56-e8885e07d0ff', '53cd6ff2-d235-4863-a22a-f3a6aff7c91e', '8a61444f-6dc4-4f22-b862-ab0d53933c80', NULL, 1791274421469);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('2ae36fbb-db27-477c-be1e-c5ef93f37b56', '01330cd6-ba5f-4139-8fc0-38c4af003bc8', '603f72c0-185a-42c1-a5fa-af3971a854ae', NULL, 1791274421470);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('613f0918-4d14-4371-96fb-232c1e072395', '53cd6ff2-d235-4863-a22a-f3a6aff7c91e', '603f72c0-185a-42c1-a5fa-af3971a854ae', NULL, 1791274421471);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('272169ea-2ea0-42bd-ad13-1eb4dc4bba7e', '01330cd6-ba5f-4139-8fc0-38c4af003bc8', '148606c4-8d01-4d3a-af5a-c7aab8f9228e', NULL, 1791274421472);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('86763cca-2503-4c42-a15c-28c016ab61c3', '53cd6ff2-d235-4863-a22a-f3a6aff7c91e', '148606c4-8d01-4d3a-af5a-c7aab8f9228e', NULL, 1791274421473);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('61057314-02dd-4bca-91c9-66e00a760664', '8a61444f-6dc4-4f22-b862-ab0d53933c80', '4e382067-fa66-48d5-a7d2-3719636365de', NULL, 1791274421474);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('23e10e88-8e5a-4b1a-84a3-15b2d51b110e', '9669501b-f4c8-4646-83d8-e1bcf9c56c09', '4e382067-fa66-48d5-a7d2-3719636365de', NULL, 1791274421475);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('964f2764-055c-4c96-bf60-714a463a3a3c', '8a61444f-6dc4-4f22-b862-ab0d53933c80', 'f01a9b98-c1c8-44f1-be5b-771d8f528b2d', NULL, 1791274421476);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('ec378a39-9315-4b64-ac94-218acf858830', '9669501b-f4c8-4646-83d8-e1bcf9c56c09', 'f01a9b98-c1c8-44f1-be5b-771d8f528b2d', NULL, 1791274421477);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('57c70840-8f5e-439f-82c0-7e651ff9a1bc', '603f72c0-185a-42c1-a5fa-af3971a854ae', '8c4e3275-2c26-425a-b96c-da00ad0a8ea6', NULL, 1791274421478);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('0aef03b6-e18e-4592-8996-4448646e786d', '9d8469b4-bca9-46c0-89a2-41e92ff6e848', '8c4e3275-2c26-425a-b96c-da00ad0a8ea6', NULL, 1791274421479);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('a1736d8e-57ac-4881-9d71-796c95640a4c', '603f72c0-185a-42c1-a5fa-af3971a854ae', 'fa42f43e-27cd-45c5-a2e6-a25c80b26275', NULL, 1791274421480);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('61f96382-8fb6-4a26-be34-31c6e4daacc2', '9d8469b4-bca9-46c0-89a2-41e92ff6e848', 'fa42f43e-27cd-45c5-a2e6-a25c80b26275', NULL, 1791274421481);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('91355fcd-f673-4950-b0ea-dc704b778845', '148606c4-8d01-4d3a-af5a-c7aab8f9228e', 'b1f8bbd8-d646-424b-b937-e2d99a13f71b', 'adopted', 1791274421482);
INSERT INTO parent_edges (id, parent_id, child_id, adoption, created_at) VALUES ('709cc356-daa9-42c7-afa1-849f500e092b', '4deba07a-9094-43ca-ad98-6a3c43216edc', 'b1f8bbd8-d646-424b-b937-e2d99a13f71b', 'adopted', 1791274421483);
