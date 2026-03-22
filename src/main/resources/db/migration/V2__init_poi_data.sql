-- =============================================
-- V2__init_restaurant_data.sql
-- 식당 초기 데이터 삽입
-- =============================================

INSERT INTO restaurant (name, campus, category, site_url) VALUES
-- 광주 교내
('제1학생마루',  'GWANGJU', 'CAMPUS', 'https://today.jnu.ac.kr/Program/MealPlan.aspx'),
('햇들마루',     'GWANGJU', 'CAMPUS', 'https://today.jnu.ac.kr/Program/MealPlan.aspx'),
('제2학생마루',  'GWANGJU', 'CAMPUS', 'https://today.jnu.ac.kr/Program/MealPlan.aspx'),
('학동-명학회관','GWANGJU', 'CAMPUS', 'https://today.jnu.ac.kr/Program/MealPlan.aspx'),

-- 여수·화순 교내
('여수-학생회관','YEOSU',   'CAMPUS', 'https://today.jnu.ac.kr/Program/MealPlan.aspx'),
('화순-여미샘',  'HWASOON', 'CAMPUS', 'https://today.jnu.ac.kr/Program/MealPlan.aspx'),

-- 기숙사
('광주생활관',   'GWANGJU', 'DORM',   'https://dormitory.jnu.ac.kr/Main.aspx'),
('여수생활관',   'YEOSU',   'DORM',   'https://house.jnu.ac.kr/');
