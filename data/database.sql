CREATE TABLE stock_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT NOT NULL,
    name        TEXT NOT NULL,
    brand       TEXT NOT NULL,
    car_type    TEXT NOT NULL,
    price       INTEGER NOT NULL,
    price_code  TEXT NOT NULL,
    date        TEXT DEFAULT (datetime('now')),
    quantity    INTEGER NOT NULL
);

