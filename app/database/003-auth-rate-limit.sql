-- Неудачные попытки входа: по ним считается лимит 5 на аккаунт и 20 на IP за 15 минут.
CREATE TABLE login_attempts (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX login_attempts_email_time ON login_attempts (email, attempted_at DESC);
CREATE INDEX login_attempts_ip_time ON login_attempts (ip, attempted_at DESC);
