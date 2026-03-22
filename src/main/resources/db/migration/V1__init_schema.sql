-- =============================================
-- V1__init_schema.sql
-- JNU Hub 초기 스키마 생성
-- =============================================

-- 1. 식당 정보
CREATE TABLE restaurant (
                            id          BIGSERIAL    PRIMARY KEY,
                            name        VARCHAR(50)  NOT NULL UNIQUE,
                            campus      VARCHAR(20)  NOT NULL,           -- GWANGJU | YEOSU | HWASOON
                            category    VARCHAR(20)  NOT NULL,           -- CAMPUS | DORM
                            site_url    VARCHAR(255),
                            created_at  TIMESTAMP    NOT NULL DEFAULT now(),
                            updated_at  TIMESTAMP    NOT NULL DEFAULT now()
);

-- 2. 식단 정보
CREATE TABLE meal_plan (
                           id            BIGSERIAL    PRIMARY KEY,
                           restaurant_id BIGINT       NOT NULL REFERENCES restaurant(id),
                           meal_date     DATE         NOT NULL,
                           meal_type     VARCHAR(20)  NOT NULL,          -- BREAKFAST | LUNCH | DINNER
                           sub_type      VARCHAR(20),                    -- KOREAN | SPECIAL | TYPE_A | TYPE_B
                           menu_items    TEXT[]       NOT NULL DEFAULT '{}',
                           crawled_at    TIMESTAMP    NOT NULL DEFAULT now(),
                           UNIQUE (restaurant_id, meal_date, meal_type, sub_type)
);

CREATE INDEX idx_meal_plan_lookup
    ON meal_plan (restaurant_id, meal_date, meal_type);

-- 3. 크롤링 메타 (날짜 단위)
CREATE TABLE crawl_meta (
                            id              BIGSERIAL    PRIMARY KEY,
                            restaurant_id   BIGINT       NOT NULL REFERENCES restaurant(id),
                            target_date     DATE         NOT NULL,
                            last_crawled_at TIMESTAMP    NOT NULL DEFAULT now(),
                            status          VARCHAR(20)  NOT NULL DEFAULT 'SUCCESS', -- SUCCESS | FAIL | PARTIAL
                            error_message   TEXT,                                    -- 실패 시 사유 기록
                            UNIQUE (restaurant_id, target_date)
);

-- 4. 혼잡도 로그
CREATE TABLE congestion_log (
                                id           BIGSERIAL    PRIMARY KEY,
                                location_id  VARCHAR(50)  NOT NULL,           -- ex) GWANGJU_DORM_REST
                                people_count INT          NOT NULL CHECK (people_count >= 0),
                                measured_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_congestion_measured_at
    ON congestion_log (measured_at);

-- 5. FAQ (AI 지식베이스)
CREATE TABLE faq (
                     id          BIGSERIAL    PRIMARY KEY,
                     category    VARCHAR(50),                      -- GRADUATION | TUITION | FACILITY ...
                     question    TEXT         NOT NULL,
                     answer      TEXT         NOT NULL,
                     is_active   BOOLEAN      NOT NULL DEFAULT true,
                     created_at  TIMESTAMP    NOT NULL DEFAULT now(),
                     updated_at  TIMESTAMP    NOT NULL DEFAULT now()
);