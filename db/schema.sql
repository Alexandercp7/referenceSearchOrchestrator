CREATE DATABASE IF NOT EXISTS reference_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE reference_db;

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  created_at    DATETIME     NOT NULL
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS watchlist_items (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  product_url TEXT         NOT NULL,
  store       VARCHAR(50)  NOT NULL,
  title       VARCHAR(500) NOT NULL,
  added_at    DATETIME     NOT NULL,
  INDEX idx_user (user_id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS price_snapshots (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  product_url TEXT          NOT NULL,
  store       VARCHAR(50)   NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  currency    VARCHAR(10)   NOT NULL,
  scraped_at  DATETIME      NOT NULL,
  INDEX idx_product_url (product_url(255))
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS alerts (
  id                VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id           VARCHAR(36) NOT NULL,
  product_url       TEXT        NOT NULL,
  condition_json    TEXT        NOT NULL,
  active            TINYINT(1)  NOT NULL DEFAULT 1,
  last_triggered_at DATETIME    NULL,
  INDEX idx_user   (user_id),
  INDEX idx_active (active)
) ENGINE = InnoDB;
